"""Helpers for issuing JWTs and managing the refresh-token cookie.

The short-lived access token is returned in the JSON body and kept in memory by
the frontend. The long-lived refresh token only ever travels in an httpOnly
cookie, so page scripts (and therefore XSS) cannot read it.
"""
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

CSRF_HEADER = "HTTP_X_REQUESTED_WITH"
CSRF_HEADER_VALUE = "aimers"


def issue_session(user) -> tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def set_refresh_cookie(response, refresh_token: str) -> None:
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=int(settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def has_csrf_header(request) -> bool:
    """Cookie-authenticated endpoints require a custom header.

    Browsers will not add a custom header to a cross-site request without a CORS
    preflight, which our allow-list rejects, so forged requests are blocked.
    """
    return request.META.get(CSRF_HEADER) == CSRF_HEADER_VALUE
