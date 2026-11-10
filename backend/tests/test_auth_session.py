import pytest
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken

from .conftest import PASSWORD

LOGIN = "/api/v1/auth/login/"
REFRESH = "/api/v1/auth/refresh/"
LOGOUT = "/api/v1/auth/logout/"
REGISTER = "/api/v1/auth/register/"
HEADER = {"HTTP_X_REQUESTED_WITH": "aimers"}
COOKIE = settings.REFRESH_COOKIE_NAME


def login(client, identifier="ace", password=PASSWORD):
    return client.post(LOGIN, {"identifier": identifier, "password": password}, format="json")


@pytest.mark.django_db
@pytest.mark.parametrize("identifier", ["ace", "ACE", "ace@example.com", "Ace@Example.COM"])
def test_login_with_username_or_email(api_client, make_user, identifier):
    user = make_user("ace")
    response = login(api_client, identifier)
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == "ace"
    assert AccessToken(body["access"])["user_id"] == str(user.id)


@pytest.mark.django_db
def test_login_sets_httponly_refresh_cookie_and_not_in_body(api_client, make_user):
    make_user("ace")
    response = login(api_client)
    cookie = response.cookies[COOKIE]
    assert cookie["httponly"]
    assert cookie["path"] == settings.REFRESH_COOKIE_PATH
    assert cookie["samesite"] == settings.REFRESH_COOKIE_SAMESITE
    assert "refresh" not in response.json()


@pytest.mark.django_db
def test_login_failures_are_indistinguishable(api_client, make_user):
    make_user("ace")
    wrong_password = login(api_client, "ace", "wrong-password-1")
    unknown_user = login(api_client, "nobody", PASSWORD)
    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json() == unknown_user.json()
    assert COOKIE not in wrong_password.cookies


@pytest.mark.django_db
def test_inactive_user_cannot_login(api_client, make_user):
    make_user("ace", is_active=False)
    assert login(api_client).status_code == 401


@pytest.mark.django_db
def test_register_signs_the_user_in(api_client):
    response = api_client.post(
        REGISTER, {"username": "ace", "email": "ace@example.com", "password": PASSWORD}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["access"]
    assert response.cookies[COOKIE]["httponly"]


@pytest.mark.django_db
def test_refresh_rotates_cookie_and_returns_access_token(api_client, make_user):
    make_user("ace")
    first = login(api_client).cookies[COOKIE].value
    response = api_client.post(REFRESH, **HEADER)
    assert response.status_code == 200
    assert response.json()["access"]
    assert response.cookies[COOKIE].value != first


@pytest.mark.django_db
def test_used_refresh_token_cannot_be_replayed(api_client, make_user):
    make_user("ace")
    old = login(api_client).cookies[COOKIE].value
    assert api_client.post(REFRESH, **HEADER).status_code == 200  # rotates; old is blacklisted
    api_client.cookies[COOKIE] = old
    assert api_client.post(REFRESH, **HEADER).status_code == 401


@pytest.mark.django_db
def test_refresh_without_cookie_is_unauthorised(api_client):
    assert api_client.post(REFRESH, **HEADER).status_code == 401


@pytest.mark.django_db
def test_refresh_requires_custom_header(api_client, make_user):
    make_user("ace")
    login(api_client)
    assert api_client.post(REFRESH).status_code == 403


@pytest.mark.django_db
def test_refresh_with_garbage_cookie_is_unauthorised(api_client):
    api_client.cookies[COOKIE] = "not-a-token"
    assert api_client.post(REFRESH, **HEADER).status_code == 401


@pytest.mark.django_db
def test_logout_revokes_refresh_token_and_clears_cookie(api_client, make_user):
    make_user("ace")
    token = login(api_client).cookies[COOKIE].value
    response = api_client.post(LOGOUT, **HEADER)
    assert response.status_code == 204
    assert response.cookies[COOKIE].value == ""
    api_client.cookies[COOKIE] = token
    assert api_client.post(REFRESH, **HEADER).status_code == 401


@pytest.mark.django_db
def test_logout_requires_custom_header(api_client, make_user):
    make_user("ace")
    login(api_client)
    assert api_client.post(LOGOUT).status_code == 403
