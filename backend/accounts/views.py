from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, ProfileUpdateSerializer, RegisterSerializer, UserSerializer
from .tokens import clear_refresh_cookie, has_csrf_header, issue_session, set_refresh_cookie

User = get_user_model()

# Used to spend the same hashing time when the account does not exist, so response
# timing does not reveal which usernames/emails are registered.
_DUMMY_HASH = make_password("dummy-password-for-timing")


def session_response(user, http_status=status.HTTP_200_OK) -> Response:
    access, refresh = issue_session(user)
    response = Response({"user": UserSerializer(user).data, "access": access}, status=http_status)
    set_refresh_cookie(response, refresh)
    return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return session_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        user = User.objects.filter(Q(email__iexact=identifier) | Q(username__iexact=identifier)).first()
        if user is None:
            check_password(password, _DUMMY_HASH)
        if user is None or not user.check_password(password) or not user.is_active:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return session_response(user)


class MeView(APIView):
    """The signed-in player's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class RefreshView(APIView):
    """Exchange the refresh cookie for a new access token (and rotate the cookie)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        if not has_csrf_header(request):
            return Response({"detail": "Missing request header."}, status=status.HTTP_403_FORBIDDEN)
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not token:
            return Response({"detail": "Not signed in."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={"refresh": token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, AuthenticationFailed):
            # expired, blacklisted (already used), tampered with, or user disabled
            response = Response({"detail": "Session expired."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_refresh_cookie(response)
            return response

        response = Response({"access": serializer.validated_data["access"]})
        set_refresh_cookie(response, serializer.validated_data["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        if not has_csrf_header(request):
            return Response({"detail": "Missing request header."}, status=status.HTTP_403_FORBIDDEN)
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass  # already expired or blacklisted: nothing to revoke
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response
