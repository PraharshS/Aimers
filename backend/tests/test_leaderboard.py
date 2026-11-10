import pytest
from django.core.cache import cache

from .factories import finished_run

LB = "/api/v1/leaderboard/"
TREND = "/api/v1/leaderboard/trend/"
RECENT = "/api/v1/players/recent/"


def names(response):
    return [r["username"] for r in response.json()["results"]]


@pytest.mark.django_db
def test_leaderboard_is_public_and_empty_at_first(api_client):
    response = api_client.get(LB)
    assert response.status_code == 200
    assert response.json() == {"results": []}


@pytest.mark.django_db
def test_each_player_appears_once_with_their_best_run_ranked(api_client, make_user):
    a, b, c = make_user("alice"), make_user("bob"), make_user("cara")
    finished_run(a, score=100)
    finished_run(a, score=300)
    finished_run(b, score=200)
    finished_run(b, score=50)
    finished_run(c, score=250)
    body = api_client.get(LB).json()["results"]
    assert [(r["rank"], r["username"], r["score"]) for r in body] == [
        (1, "alice", 300), (2, "cara", 250), (3, "bob", 200),
    ]


@pytest.mark.django_db
def test_ties_are_won_by_the_earlier_run(api_client, make_user):
    late, early = make_user("late"), make_user("early")
    finished_run(late, score=100, minutes_ago=1)
    finished_run(early, score=100, minutes_ago=10)
    assert names(api_client.get(LB)) == ["early", "late"]


@pytest.mark.django_db
def test_flagged_and_unfinished_runs_do_not_count(api_client, make_user):
    cheat, fair = make_user("cheat"), make_user("fair")
    finished_run(cheat, score=99999, flagged=True)
    finished_run(fair, score=100)
    assert names(api_client.get(LB)) == ["fair"]


@pytest.mark.django_db
def test_task_filter(api_client, make_user):
    a, b = make_user("alice"), make_user("bob")
    finished_run(a, task_id="gridshot", score=100)
    finished_run(b, task_id="tracking", score=500)
    assert names(api_client.get(LB, {"task": "gridshot"})) == ["alice"]
    assert names(api_client.get(LB, {"task": "all"})) == ["bob", "alice"]


@pytest.mark.django_db
def test_period_filter_excludes_old_runs(api_client, make_user):
    a, b = make_user("alice"), make_user("bob")
    finished_run(a, score=900, minutes_ago=60 * 24 * 3)  # 3 days ago
    finished_run(b, score=100, minutes_ago=5)
    assert names(api_client.get(LB, {"period": "day"})) == ["bob"]
    assert names(api_client.get(LB, {"period": "week"})) == ["alice", "bob"]


@pytest.mark.django_db
def test_limit_and_validation(api_client, make_user):
    for i in range(5):
        finished_run(make_user(f"p{i}"), score=i)
    assert len(api_client.get(LB, {"limit": 2}).json()["results"]) == 2
    assert api_client.get(LB, {"limit": 0}).status_code == 400
    assert api_client.get(LB, {"limit": 1000}).status_code == 400
    assert api_client.get(LB, {"period": "century"}).status_code == 400


@pytest.mark.django_db
def test_leaderboard_never_exposes_email(api_client, make_user):
    finished_run(make_user("alice"), score=100)
    row = api_client.get(LB).json()["results"][0]
    assert "email" not in row
    assert "user_id" not in row and "id" not in row
    assert set(row) >= {"rank", "username", "avatar_url", "task_name", "score", "accuracy", "played_at"}


@pytest.mark.django_db
def test_leaderboard_is_cached_briefly(api_client, make_user):
    a = make_user("alice")
    finished_run(a, score=100)
    first = api_client.get(LB).json()
    finished_run(make_user("bob"), score=500)
    assert api_client.get(LB).json() == first  # still the cached board
    cache.clear()
    assert names(api_client.get(LB)) == ["bob", "alice"]


@pytest.mark.django_db
def test_trend_groups_scores_into_buckets_with_averages(api_client, make_user):
    a = make_user("alice")
    finished_run(a, score=100, minutes_ago=0)
    finished_run(a, score=200, minutes_ago=0)
    finished_run(a, score=600, minutes_ago=60 * 24 * 2)
    results = api_client.get(TREND, {"period": "daily"}).json()["results"]
    assert [(r["score"], r["count"]) for r in results] == [(600, 1), (150, 2)]
    assert results[0]["bucket"] < results[1]["bucket"]


@pytest.mark.django_db
def test_trend_validates_period(api_client):
    assert api_client.get(TREND, {"period": "yearly"}).status_code == 400


@pytest.mark.django_db
def test_recent_players_one_row_each_latest_first_last_24h_only(api_client, make_user):
    a, b, c = make_user("alice"), make_user("bob"), make_user("cara")
    finished_run(a, score=1, minutes_ago=30)
    finished_run(a, score=2, minutes_ago=10)  # alice's latest
    finished_run(b, score=3, minutes_ago=20)
    finished_run(c, score=4, minutes_ago=60 * 30)  # too old
    results = api_client.get(RECENT).json()["results"]
    assert [(r["username"], r["score"]) for r in results] == [("alice", 2), ("bob", 3)]
