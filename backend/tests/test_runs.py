import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from runs.models import Run

START = "/api/v1/runs/start/"


def finish_url(run_id):
    return f"/api/v1/runs/{run_id}/finish/"


def config(**overrides):
    data = {
        "roundDuration": 30, "hitScore": 10, "missPenalty": 3,
        "movementType": "stationary", "maxTargets": 3, "spawnDelay": 450,
    }
    data.update(overrides)
    return data


def start(client, task_id="gridshot", cfg=None):
    return client.post(
        START,
        {"task_id": task_id, "task_name": "Gridshot", "config": cfg or config()},
        format="json",
    )


def age(run_id, seconds):
    """Pretend the run started `seconds` ago (instead of sleeping in tests)."""
    Run.objects.filter(pk=run_id).update(started_at=timezone.now() - timedelta(seconds=seconds))


def submit(client, run_id, score=200, hits=25, misses=5):
    return client.post(finish_url(run_id), {"score": score, "hits": hits, "misses": misses}, format="json")


# ---------- start ----------

@pytest.mark.django_db
def test_start_requires_authentication(api_client):
    assert start(api_client).status_code == 401


@pytest.mark.django_db
def test_start_opens_a_run(auth_client):
    response = start(auth_client)
    assert response.status_code == 201
    run = Run.objects.get(pk=response.json()["id"])
    assert run.user == auth_client.user
    assert run.status == "started"
    assert run.duration == 30
    assert run.config["hitScore"] == 10


@pytest.mark.django_db
@pytest.mark.parametrize(
    "overrides",
    [{"roundDuration": 5}, {"roundDuration": 9999}, {"hitScore": 5000}, {"movementType": "teleport"}, {"maxTargets": 0}],
)
def test_start_rejects_out_of_range_config(auth_client, overrides):
    assert start(auth_client, cfg=config(**overrides)).status_code == 400


@pytest.mark.django_db
def test_starting_a_new_run_expires_the_previous_open_one(auth_client):
    first = start(auth_client).json()["id"]
    second = start(auth_client).json()["id"]
    assert Run.objects.get(pk=first).status == "expired"
    assert Run.objects.get(pk=second).status == "started"


# ---------- finish: happy path ----------

@pytest.mark.django_db
def test_finish_saves_result_and_computes_accuracy_on_the_server(auth_client):
    run_id = start(auth_client).json()["id"]
    age(run_id, 31)
    response = submit(auth_client, run_id, score=200, hits=25, misses=5)
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 200
    assert body["accuracy"] == pytest.approx(25 / 30)
    assert body["status"] == "finished"
    assert body["personal_best"] is True
    run = Run.objects.get(pk=run_id)
    assert run.finished_at is not None
    assert run.flagged is False


@pytest.mark.django_db
def test_finish_is_idempotent_and_ignores_a_changed_payload(auth_client):
    run_id = start(auth_client).json()["id"]
    age(run_id, 31)
    first = submit(auth_client, run_id, score=200, hits=25, misses=5).json()
    second = submit(auth_client, run_id, score=250, hits=25, misses=0)
    assert second.status_code == 200
    assert second.json()["score"] == 200
    assert second.json()["id"] == first["id"]


@pytest.mark.django_db
def test_personal_best_flag_only_when_beating_previous_runs(auth_client):
    results = []
    for score, hits in [(200, 25), (150, 20), (300, 35)]:
        run_id = start(auth_client).json()["id"]
        age(run_id, 31)
        results.append(submit(auth_client, run_id, score=score, hits=hits, misses=0).json()["personal_best"])
    assert results == [True, False, True]


@pytest.mark.django_db
def test_tracking_task_accepts_tenths_of_a_second_counts(auth_client):
    cfg = config(movementType="horizontal", hitScore=100)
    run_id = start(auth_client, cfg=cfg).json()["id"]
    age(run_id, 31)
    # 30s round: 200 tenths on target, 100 off target, 2400 points
    response = submit(auth_client, run_id, score=2400, hits=200, misses=100)
    assert response.status_code == 200
    assert response.json()["accuracy"] == pytest.approx(200 / 300)


# ---------- finish: rejection of implausible or invalid submissions ----------

@pytest.mark.django_db
def test_finish_rejects_a_run_submitted_before_the_round_could_end(auth_client):
    run_id = start(auth_client).json()["id"]
    response = submit(auth_client, run_id)  # started a moment ago
    assert response.status_code == 422
    assert Run.objects.get(pk=run_id).status == "started"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "payload",
    [
        {"score": 99999, "hits": 25, "misses": 0},  # more points than hits allow
        {"score": 200, "hits": 500, "misses": 0},  # >10 hits per second
    ],
)
def test_finish_rejects_impossible_numbers(auth_client, payload):
    run_id = start(auth_client).json()["id"]
    age(run_id, 31)
    response = auth_client.post(finish_url(run_id), payload, format="json")
    assert response.status_code == 422
    assert Run.objects.get(pk=run_id).status == "started"


@pytest.mark.django_db
def test_tracking_score_cannot_exceed_full_time_on_target(auth_client):
    run_id = start(auth_client, cfg=config(movementType="2d", hitScore=100)).json()["id"]
    age(run_id, 31)
    assert submit(auth_client, run_id, score=999999, hits=100, misses=100).status_code == 422


@pytest.mark.django_db
def test_unusually_high_hit_rate_is_saved_but_flagged(auth_client):
    run_id = start(auth_client).json()["id"]
    age(run_id, 31)
    response = submit(auth_client, run_id, score=1900, hits=190, misses=0)  # >6 hits/s
    assert response.status_code == 200
    assert response.json()["personal_best"] is False
    run = Run.objects.get(pk=run_id)
    assert run.flagged is True
    assert run.flag_reason


@pytest.mark.django_db
def test_finish_rejects_negative_or_malformed_values(auth_client):
    run_id = start(auth_client).json()["id"]
    age(run_id, 31)
    for payload in [{"score": 10, "hits": -1, "misses": 0}, {"score": "x", "hits": 1, "misses": 0}, {}]:
        assert auth_client.post(finish_url(run_id), payload, format="json").status_code == 400


# ---------- finish: ownership and lifecycle ----------

@pytest.mark.django_db
def test_cannot_finish_another_players_run(auth_client, make_user, api_client):
    other = make_user("other")
    run = Run.objects.create(user=other, task_id="t", task_name="T", config=config(), duration=30)
    age(run.id, 31)
    assert submit(auth_client, run.id).status_code == 404


@pytest.mark.django_db
def test_finish_unknown_run_is_404(auth_client):
    assert submit(auth_client, uuid.uuid4()).status_code == 404


@pytest.mark.django_db
def test_finish_requires_authentication(api_client):
    assert submit(api_client, uuid.uuid4()).status_code == 401


@pytest.mark.django_db
def test_run_left_open_far_too_long_expires(auth_client):
    run_id = start(auth_client).json()["id"]
    age(run_id, 30 + 901)
    response = submit(auth_client, run_id)
    assert response.status_code == 409
    assert Run.objects.get(pk=run_id).status == "expired"


@pytest.mark.django_db
def test_cannot_finish_an_abandoned_run(auth_client):
    first = start(auth_client).json()["id"]
    start(auth_client)  # abandons the first
    age(first, 31)
    assert submit(auth_client, first).status_code == 409
