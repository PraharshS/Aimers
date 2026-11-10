"""Public, read-only endpoints: leaderboards, trend chart, recent players.

Responses are cached for a few seconds (cache-aside with a short TTL). Many
viewers asking for the same board cost one database query per TTL window, and a
new score shows up within seconds. Swapping the local-memory cache for Redis
makes the cache shared across workers without changing this code.
"""
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, Count, Subquery
from django.db.models.functions import TruncDay, TruncHour, TruncWeek
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Run

PERIOD_WINDOWS = {"day": timedelta(days=1), "week": timedelta(days=7), "month": timedelta(days=30), "all": None}
TREND_PERIODS = {
    "hourly": (TruncHour, timedelta(hours=24)),
    "daily": (TruncDay, timedelta(days=14)),
    "weekly": (TruncWeek, timedelta(weeks=12)),
}


class LeaderboardQuery(serializers.Serializer):
    task = serializers.CharField(max_length=64, default="all")
    period = serializers.ChoiceField(choices=list(PERIOD_WINDOWS), default="all")
    limit = serializers.IntegerField(min_value=1, max_value=100, default=25)


class TrendQuery(serializers.Serializer):
    task = serializers.CharField(max_length=64, default="all")
    period = serializers.ChoiceField(choices=list(TREND_PERIODS), default="daily")


def cached(key: str, build):
    """Cache-aside: return the cached value, or build it and store it for the TTL."""
    value = cache.get(key)
    if value is None:
        value = build()
        cache.set(key, value, settings.PUBLIC_CACHE_SECONDS)
    return value


def eligible_runs():
    """Runs that count publicly: finished and not flagged."""
    return Run.objects.filter(status=Run.Status.FINISHED, flagged=False)


def row(run: Run, rank: int | None = None) -> dict:
    data = {
        "username": run.user.username,
        "avatar_url": run.user.avatar_url,
        "task_id": run.task_id,
        "task_name": run.task_name,
        "score": run.score,
        "hits": run.hits,
        "misses": run.misses,
        "accuracy": run.accuracy,
        "played_at": run.finished_at,
    }
    if rank is not None:
        data["rank"] = rank
    return data


class PublicView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_read"


class LeaderboardView(PublicView):
    """Each player's single best run, ranked. ?task=<id|all>&period=day|week|month|all&limit=25"""

    def get(self, request):
        query = LeaderboardQuery(data=request.query_params)
        query.is_valid(raise_exception=True)
        task, period, limit = query.validated_data["task"], query.validated_data["period"], query.validated_data["limit"]

        def build():
            runs = eligible_runs()
            if task != "all":
                runs = runs.filter(task_id=task)
            window = PERIOD_WINDOWS[period]
            if window:
                runs = runs.filter(finished_at__gte=timezone.now() - window)
            # Best run per player (DISTINCT ON), then rank those by score; earlier run wins ties.
            best_per_player = runs.order_by("user_id", "-score", "finished_at").distinct("user_id")
            top = (
                Run.objects.filter(pk__in=Subquery(best_per_player.values("pk")))
                .select_related("user")
                .order_by("-score", "finished_at")[:limit]
            )
            return {"results": [row(run, rank) for rank, run in enumerate(top, start=1)]}

        return Response(cached(f"lb:{task}:{period}:{limit}", build))


class TrendView(PublicView):
    """Average score per time bucket, for the leaderboard chart. ?task=&period=hourly|daily|weekly"""

    def get(self, request):
        query = TrendQuery(data=request.query_params)
        query.is_valid(raise_exception=True)
        task, period = query.validated_data["task"], query.validated_data["period"]
        trunc, window = TREND_PERIODS[period]

        def build():
            runs = eligible_runs().filter(finished_at__gte=timezone.now() - window)
            if task != "all":
                runs = runs.filter(task_id=task)
            buckets = (
                runs.annotate(bucket=trunc("finished_at"))
                .values("bucket")
                .annotate(score=Avg("score"), count=Count("id"))
                .order_by("bucket")
            )
            return {
                "results": [
                    {"bucket": b["bucket"], "score": round(b["score"]), "count": b["count"]} for b in buckets
                ]
            }

        return Response(cached(f"trend:{task}:{period}", build))


class RecentPlayersView(PublicView):
    """Players who finished a run in the last 24 hours, most recent first (one row per player)."""

    def get(self, request):
        def build():
            runs = eligible_runs().filter(finished_at__gte=timezone.now() - timedelta(hours=24))
            latest_per_player = runs.order_by("user_id", "-finished_at").distinct("user_id")
            recent = (
                Run.objects.filter(pk__in=Subquery(latest_per_player.values("pk")))
                .select_related("user")
                .order_by("-finished_at")[:10]
            )
            return {"results": [row(run) for run in recent]}

        return Response(cached("recent-players", build))
