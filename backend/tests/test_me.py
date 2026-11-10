import pytest

ME = "/api/v1/me/"


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    assert api_client.get(ME).status_code == 401


@pytest.mark.django_db
def test_me_rejects_a_bad_token(api_client):
    api_client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
    assert api_client.get(ME).status_code == 401


@pytest.mark.django_db
def test_me_returns_own_profile(auth_client):
    response = auth_client.get(ME)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "ace"
    assert body["email"] == "ace@example.com"
    assert body["dpi"] == 800
    assert body["valorant_sens"] == 0.5
    assert body["id"] == str(auth_client.user.id)
    assert "created_at" in body
    assert "password" not in body


@pytest.mark.django_db
def test_me_patch_updates_sensitivity_settings(auth_client):
    response = auth_client.patch(ME, {"dpi": 1600, "valorant_sens": 0.35}, format="json")
    assert response.status_code == 200
    auth_client.user.refresh_from_db()
    assert auth_client.user.dpi == 1600
    assert auth_client.user.valorant_sens == 0.35


@pytest.mark.django_db
@pytest.mark.parametrize("data", [{"dpi": 50}, {"dpi": 99999}, {"valorant_sens": 0}, {"valorant_sens": 50}])
def test_me_patch_rejects_out_of_range_values(auth_client, data):
    assert auth_client.patch(ME, data, format="json").status_code == 400


@pytest.mark.django_db
def test_me_patch_can_change_username(auth_client):
    response = auth_client.patch(ME, {"username": "ace_new"}, format="json")
    assert response.status_code == 200
    assert response.json()["username"] == "ace_new"


@pytest.mark.django_db
def test_me_patch_can_resubmit_own_username(auth_client):
    assert auth_client.patch(ME, {"username": "ACE"}, format="json").status_code == 200


@pytest.mark.django_db
def test_me_patch_rejects_taken_username(auth_client, make_user):
    make_user("other")
    response = auth_client.patch(ME, {"username": "Other"}, format="json")
    assert response.status_code == 400
    assert "username" in response.json()


@pytest.mark.django_db
def test_me_patch_ignores_email_and_avatar_fields(auth_client):
    auth_client.patch(ME, {"email": "hacker@example.com", "avatar_url": "http://x.test/a.png"}, format="json")
    auth_client.user.refresh_from_db()
    assert auth_client.user.email == "ace@example.com"
    assert auth_client.user.avatar_url == ""
