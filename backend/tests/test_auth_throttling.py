import pytest

from .conftest import PASSWORD

LOGIN = "/api/v1/auth/login/"
REGISTER = "/api/v1/auth/register/"


def attempt(client, identifier, password="wrong-password-1"):
    return client.post(LOGIN, {"identifier": identifier, "password": password}, format="json")


@pytest.mark.django_db
def test_repeated_failures_on_one_account_are_throttled(api_client, make_user):
    make_user("ace")
    assert [attempt(api_client, "ace").status_code for _ in range(5)] == [401] * 5
    blocked = attempt(api_client, "ace", PASSWORD)  # even the right password is refused
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


@pytest.mark.django_db
def test_account_throttle_ignores_case_of_identifier(api_client, make_user):
    make_user("ace")
    for name in ["ace", "ACE", "Ace", "aCe", "acE"]:
        attempt(api_client, name)
    assert attempt(api_client, "ace").status_code == 429


@pytest.mark.django_db
def test_other_accounts_are_not_affected_by_one_accounts_throttle(api_client, make_user):
    make_user("ace")
    make_user("other")
    for _ in range(6):
        attempt(api_client, "ace")
    assert attempt(api_client, "other", PASSWORD).status_code == 200


@pytest.mark.django_db
def test_one_ip_cannot_guess_across_many_accounts(api_client):
    statuses = [attempt(api_client, f"user{i}").status_code for i in range(11)]
    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429


@pytest.mark.django_db
def test_forged_forwarded_for_header_does_not_dodge_ip_throttle(api_client):
    for i in range(10):
        api_client.post(
            LOGIN,
            {"identifier": f"user{i}", "password": "x"},
            format="json",
            HTTP_X_FORWARDED_FOR=f"10.0.0.{i}",
        )
    response = api_client.post(
        LOGIN, {"identifier": "another", "password": "x"}, format="json", HTTP_X_FORWARDED_FOR="10.9.9.9"
    )
    assert response.status_code == 429


@pytest.mark.django_db
def test_registration_is_limited_per_ip(api_client):
    codes = []
    for i in range(6):
        response = api_client.post(
            REGISTER,
            {"username": f"player{i}", "email": f"player{i}@example.com", "password": PASSWORD},
            format="json",
        )
        codes.append(response.status_code)
    assert codes == [201] * 5 + [429]
