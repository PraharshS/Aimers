import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

PASSWORD = "s3cure-pass-1"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(make_user):
    """An APIClient signed in (real access token) as a user named 'ace'."""
    user = make_user("ace")
    client = APIClient()
    response = client.post(
        "/api/v1/auth/login/", {"identifier": "ace", "password": PASSWORD}, format="json"
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}")
    client.user = user
    return client


@pytest.fixture
def make_user(db):
    def _make(username="ace", email=None, password=PASSWORD, **extra):
        return get_user_model().objects.create_user(
            username=username, email=email or f"{username}@example.com", password=password, **extra
        )

    return _make
