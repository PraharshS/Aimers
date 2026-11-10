import pytest
from django.contrib.auth import get_user_model

from .conftest import PASSWORD

URL = "/api/v1/auth/register/"
User = get_user_model()


def payload(**overrides):
    data = {"username": "ace", "email": "Ace@Example.com", "password": PASSWORD}
    data.update(overrides)
    return data


@pytest.mark.django_db
def test_register_creates_user_and_hides_password(api_client):
    response = api_client.post(URL, payload(), format="json")
    assert response.status_code == 201
    body = response.json()["user"]
    assert body["username"] == "ace"
    assert body["email"] == "ace@example.com"
    assert "password" not in body
    user = User.objects.get(username="ace")
    assert user.check_password(PASSWORD)
    assert user.password != PASSWORD


@pytest.mark.django_db
@pytest.mark.parametrize("username", ["ab", "has space", "a" * 25, "bad!char"])
def test_register_rejects_invalid_usernames(api_client, username):
    response = api_client.post(URL, payload(username=username), format="json")
    assert response.status_code == 400
    assert "username" in response.json()


@pytest.mark.django_db
def test_register_rejects_duplicate_username_ignoring_case(api_client, make_user):
    make_user(username="Ace", email="other@example.com")
    response = api_client.post(URL, payload(username="ace"), format="json")
    assert response.status_code == 400
    assert "username" in response.json()


@pytest.mark.django_db
def test_register_rejects_duplicate_email_ignoring_case(api_client, make_user):
    make_user(username="other", email="ace@example.com")
    response = api_client.post(URL, payload(email="ACE@EXAMPLE.COM"), format="json")
    assert response.status_code == 400
    assert "email" in response.json()


@pytest.mark.django_db
@pytest.mark.parametrize("password", ["short1", "12345678", "password"])
def test_register_rejects_weak_passwords(api_client, password):
    response = api_client.post(URL, payload(password=password), format="json")
    assert response.status_code == 400
    assert "password" in response.json()


@pytest.mark.django_db
def test_register_rejects_password_similar_to_username(api_client):
    response = api_client.post(
        URL, payload(username="playerone", password="playerone1"), format="json"
    )
    assert response.status_code == 400
    assert "password" in response.json()


@pytest.mark.django_db
def test_register_requires_all_fields(api_client):
    response = api_client.post(URL, {}, format="json")
    assert response.status_code == 400
    assert set(response.json()) == {"username", "email", "password"}
