import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Run(models.Model):
    """One attempt at a task.

    A run is opened by the server when a round starts and closed when the client
    submits the result. Only finished, unflagged runs count for leaderboards.
    """

    class Status(models.TextChoices):
        STARTED = "started"
        FINISHED = "finished"
        EXPIRED = "expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="runs")

    task_id = models.CharField(max_length=64)
    task_name = models.CharField(max_length=120)
    # Server-validated snapshot of the task settings used for this run
    # (roundDuration, hitScore, missPenalty, movementType, maxTargets, spawnDelay).
    config = models.JSONField()
    duration = models.PositiveIntegerField(help_text="Configured round length in seconds")

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.STARTED)
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)

    score = models.IntegerField(null=True, blank=True)
    hits = models.PositiveIntegerField(null=True, blank=True)
    misses = models.PositiveIntegerField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)

    flagged = models.BooleanField(default=False)
    flag_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-finished_at"], name="run_user_finished_idx"),
            models.Index(fields=["user", "status"], name="run_user_status_idx"),
            models.Index(
                fields=["task_id", "-score"],
                condition=Q(status="finished", flagged=False),
                name="run_task_score_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user_id} {self.task_id} {self.score}"
