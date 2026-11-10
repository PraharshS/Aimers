"""Server-side checks on a submitted run.

The browser still measures hits and score, so these are plausibility limits, not
proof. They remove trivially forged results; replaying a recorded shot log on the
server (planned) is what makes cheating genuinely hard.
"""
from dataclasses import dataclass, field

EARLY_TOLERANCE_SECONDS = 3
# A round can be paused, so allow generous wall-clock time before the run expires.
MAX_PAUSE_SECONDS = 900
MAX_HITS_PER_SECOND = 10
SUSPICIOUS_HITS_PER_SECOND = 6
TRACKING_TICKS_PER_SECOND = 10  # tracking tasks report on/off-target time in tenths of a second


def is_tracking(config: dict) -> bool:
    return config.get("movementType", "stationary") != "stationary"


def has_expired(duration: int, elapsed_seconds: float) -> bool:
    return elapsed_seconds > duration + MAX_PAUSE_SECONDS


@dataclass
class Verdict:
    errors: list[str] = field(default_factory=list)
    flag_reason: str = ""

    @property
    def ok(self) -> bool:
        return not self.errors


def check_run(config: dict, duration: int, elapsed_seconds: float, score: int, hits: int, misses: int) -> Verdict:
    verdict = Verdict()

    if elapsed_seconds < duration - EARLY_TOLERANCE_SECONDS:
        verdict.errors.append("Run was submitted before the round could have finished.")

    hit_score = config["hitScore"]
    if is_tracking(config):
        max_ticks = duration * TRACKING_TICKS_PER_SECOND + 20
        if hits + misses > max_ticks:
            verdict.errors.append("On/off-target time exceeds the round length.")
        if score > duration * hit_score + 1:
            verdict.errors.append("Score is higher than the maximum possible for this task.")
    else:
        if hits > duration * MAX_HITS_PER_SECOND:
            verdict.errors.append("Hit count is not humanly possible for this round length.")
        if score > hits * hit_score:
            verdict.errors.append("Score is higher than hits allow.")
        if hits > duration * SUSPICIOUS_HITS_PER_SECOND:
            verdict.flag_reason = "Unusually high hit rate"

    return verdict
