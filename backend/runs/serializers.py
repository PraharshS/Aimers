from rest_framework import serializers

from .models import Run

MOVEMENT_TYPES = ["stationary", "horizontal", "vertical", "2d"]


class RunConfigSerializer(serializers.Serializer):
    """The task settings the server needs to judge a result (camelCase, as the game uses)."""

    roundDuration = serializers.IntegerField(min_value=10, max_value=300)
    hitScore = serializers.IntegerField(min_value=0, max_value=1000)
    missPenalty = serializers.IntegerField(min_value=0, max_value=1000)
    movementType = serializers.ChoiceField(choices=MOVEMENT_TYPES)
    maxTargets = serializers.IntegerField(min_value=1, max_value=10)
    spawnDelay = serializers.IntegerField(min_value=0, max_value=5000, default=0)


class StartRunSerializer(serializers.Serializer):
    task_id = serializers.CharField(min_length=1, max_length=64)
    task_name = serializers.CharField(min_length=1, max_length=120)
    config = RunConfigSerializer()


class FinishRunSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=-1_000_000, max_value=10_000_000)
    hits = serializers.IntegerField(min_value=0, max_value=100_000)
    misses = serializers.IntegerField(min_value=0, max_value=100_000)


class RunSerializer(serializers.ModelSerializer):
    played_at = serializers.DateTimeField(source="finished_at", read_only=True)

    class Meta:
        model = Run
        fields = [
            "id", "task_id", "task_name", "status", "score", "hits", "misses",
            "accuracy", "duration", "played_at",
        ]
        read_only_fields = fields
