from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Run
from .serializers import FinishRunSerializer, RunSerializer, StartRunSerializer
from .validation import check_run, has_expired


class StartRunView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "runs_start"

    def post(self, request):
        serializer = StartRunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        config = dict(data["config"])

        with transaction.atomic():
            # One open run per player: starting a new one abandons any older one.
            Run.objects.filter(user=request.user, status=Run.Status.STARTED).update(
                status=Run.Status.EXPIRED
            )
            run = Run.objects.create(
                user=request.user,
                task_id=data["task_id"],
                task_name=data["task_name"],
                config=config,
                duration=config["roundDuration"],
            )
        return Response({"id": run.id, "duration": run.duration}, status=status.HTTP_201_CREATED)


class FinishRunView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "runs_finish"

    def post(self, request, run_id):
        serializer = FinishRunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # Row lock so two simultaneous submissions of the same run serialise.
            run = get_object_or_404(Run.objects.select_for_update(), pk=run_id, user=request.user)

            if run.status == Run.Status.FINISHED:
                # Idempotent: a retry returns the stored result and changes nothing.
                return Response(self._result(run))
            if run.status == Run.Status.EXPIRED:
                return Response({"detail": "This run has expired."}, status=status.HTTP_409_CONFLICT)

            now = timezone.now()
            elapsed = (now - run.started_at).total_seconds()
            if has_expired(run.duration, elapsed):
                run.status = Run.Status.EXPIRED
                run.save(update_fields=["status"])
                return Response({"detail": "This run has expired."}, status=status.HTTP_409_CONFLICT)

            verdict = check_run(run.config, run.duration, elapsed, data["score"], data["hits"], data["misses"])
            if not verdict.ok:
                return Response(
                    {"detail": "Run rejected.", "reasons": verdict.errors},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            total = data["hits"] + data["misses"]
            run.score = data["score"]
            run.hits = data["hits"]
            run.misses = data["misses"]
            run.accuracy = data["hits"] / total if total else 0.0
            run.flagged = bool(verdict.flag_reason)
            run.flag_reason = verdict.flag_reason
            run.finished_at = now
            run.status = Run.Status.FINISHED
            run.save()

        return Response(self._result(run), status=status.HTTP_200_OK)

    @staticmethod
    def _result(run: Run) -> dict:
        previous_best = (
            Run.objects.filter(user=run.user, task_id=run.task_id, status=Run.Status.FINISHED, flagged=False)
            .exclude(pk=run.pk)
            .aggregate(best=Max("score"))["best"]
        )
        is_pb = not run.flagged and (previous_best is None or run.score > previous_best)
        return {**RunSerializer(run).data, "personal_best": is_pb}
