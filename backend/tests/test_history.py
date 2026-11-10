import pytest

from runs.models import Run

from .factories import CONFIG, finished_run

RUNS = "/api/v1/me/runs/"
BESTS = "/api/v1/me/bests/"


@pytest.mark.django_db
def test_history_requires_authentication(api_client):
    assert api_client.get(RUNS).status_code == 401
    assert api_client.get(BESTS).status_code == 401


@pytest.mark.django_db
def test_history_lists_only_own_finished_runs_newest_first(auth_client, make_user):
    other = make_user("other")
    old = finished_run(auth_client.user, score=100, minutes_ago=30)
    new = finished_run(auth_client.user, score=200, minutes_ago=5)
    finished_run(other, score=999)
    Run.objects.create(user=auth_client.user, task_id="x", task_name="X", config=CONFIG, duration=30)  # unfinished

    results = auth_client.get(RUNS).json()["results"]
    assert [r["id"] for r in results] == [str(new.id), str(old.id)]
    assert set(results[0]) >= {"task_id", "task_name", "score", "hits", "misses", "accuracy", "played_at"}


@pytest.mark.django_db
def test_history_can_filter_by_task(auth_client):
    finished_run(auth_client.user, task_id="gridshot", score=100)
    finished_run(auth_client.user, task_id="tracking", score=200)
    results = auth_client.get(RUNS, {"task_id": "tracking"}).json()["results"]
    assert [r["task_id"] for r in results] == ["tracking"]


@pytest.mark.django_db
def test_history_pages_with_a_cursor_without_gaps_or_repeats(auth_client):
    runs = [finished_run(auth_client.user, score=i, minutes_ago=i) for i in range(5)]
    expected = [str(r.id) for r in runs]  # minutes_ago ascending == newest first

    seen, url = [], RUNS + "?limit=2"
    while url:
        body = auth_client.get(url).json()
        assert len(body["results"]) <= 2
        seen += [r["id"] for r in body["results"]]
        url = body["next"]
    assert seen == expected


@pytest.mark.django_db
def test_history_limit_is_capped(auth_client):
    for i in range(3):
        finished_run(auth_client.user, minutes_ago=i)
    assert len(auth_client.get(RUNS, {"limit": 100000}).json()["results"]) == 3


@pytest.mark.django_db
def test_bests_returns_best_score_per_task(auth_client, make_user):
    other = make_user("other")
    finished_run(auth_client.user, task_id="gridshot", score=100)
    finished_run(auth_client.user, task_id="gridshot", score=300)
    finished_run(auth_client.user, task_id="tracking", score=50)
    finished_run(auth_client.user, task_id="gridshot", score=9999, flagged=True)  # does not count
    finished_run(other, task_id="gridshot", score=5000)
    assert auth_client.get(BESTS).json() == {"bests": {"gridshot": 300, "tracking": 50}}


@pytest.mark.django_db
def test_bests_empty_for_new_player(auth_client):
    assert auth_client.get(BESTS).json() == {"bests": {}}
