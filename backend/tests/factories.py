from datetime import timedelta

from django.utils import timezone

from runs.models import Run

CONFIG = {
    "roundDuration": 30, "hitScore": 10, "missPenalty": 3,
    "movementType": "stationary", "maxTargets": 3, "spawnDelay": 450,
}


def finished_run(user, task_id="gridshot", score=100, hits=10, misses=0, minutes_ago=0, flagged=False):
    """Create a finished run directly in the database (skips the start/finish API)."""
    when = timezone.now() - timedelta(minutes=minutes_ago)
    total = hits + misses
    return Run.objects.create(
        user=user, task_id=task_id, task_name=task_id.title(), config=CONFIG, duration=30,
        status=Run.Status.FINISHED, started_at=when - timedelta(seconds=30), finished_at=when,
        score=score, hits=hits, misses=misses, accuracy=hits / total if total else 0.0, flagged=flagged,
    )
