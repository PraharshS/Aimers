import pytest
from django.db import DatabaseError, connection


@pytest.mark.django_db
def test_database_is_postgresql():
    assert connection.vendor == "postgresql"


@pytest.mark.django_db
def test_ready_endpoint_reports_database_up(client):
    response = client.get("/api/v1/health/ready/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "up"}


@pytest.mark.django_db
def test_ready_endpoint_returns_503_when_database_fails(client, monkeypatch):
    def broken_cursor(*args, **kwargs):
        raise DatabaseError("connection lost")

    monkeypatch.setattr(connection, "cursor", broken_cursor)
    response = client.get("/api/v1/health/ready/")
    assert response.status_code == 503
    assert response.json()["database"] == "down"
