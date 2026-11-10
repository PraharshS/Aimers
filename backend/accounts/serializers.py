import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,24}$")


class UserSerializer(serializers.ModelSerializer):
    """The signed-in player's own profile (includes email)."""

    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "dpi", "valorant_sens", "avatar_url", "created_at"]
        read_only_fields = fields


def validate_username_value(value: str, exclude_pk=None) -> str:
    value = value.strip()
    if not USERNAME_RE.match(value):
        raise serializers.ValidationError(
            "Username must be 3-24 characters: letters, numbers, dot, dash or underscore."
        )
    qs = User.objects.filter(username__iexact=value)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        raise serializers.ValidationError("This username is already taken.")
    return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Fields a player may change about themselves. Email and avatar are not here."""

    username = serializers.CharField(max_length=24, required=False)

    class Meta:
        model = User
        fields = ["username", "dpi", "valorant_sens"]

    def validate_username(self, value):
        return validate_username_value(value, exclude_pk=self.instance.pk)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254)  # email or username
    password = serializers.CharField(trim_whitespace=False, max_length=128)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=24)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_username(self, value):
        return validate_username_value(value)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        candidate = User(username=attrs["username"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
