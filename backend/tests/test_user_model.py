import uuid

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import identify_hasher
from django.db import IntegrityError, transaction

User = get_user_model()


@pytest.mark.django_db
def test_user_gets_uuid_pk_and_defaults():
    user = User.objects.create_user(username="ace", email="ace@example.com", password="s3cure-pass-1")
    assert isinstance(user.id, uuid.UUID)
    assert user.dpi == 800
    assert user.valorant_sens == 0.5
    assert user.avatar_url == ""


@pytest.mark.django_db
def test_password_is_hashed_with_argon2():
    user = User.objects.create_user(username="ace", email="ace@example.com", password="s3cure-pass-1")
    assert identify_hasher(user.password).algorithm == "argon2"
    assert user.check_password("s3cure-pass-1")


@pytest.mark.django_db
def test_email_is_normalised_to_lowercase():
    user = User.objects.create_user(username="ace", email="  Ace@Example.COM ", password="s3cure-pass-1")
    user.refresh_from_db()
    assert user.email == "ace@example.com"


@pytest.mark.django_db
def test_email_is_unique_case_insensitively():
    User.objects.create_user(username="ace", email="ace@example.com", password="s3cure-pass-1")
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create_user(username="other", email="ACE@example.com", password="s3cure-pass-1")


@pytest.mark.django_db
def test_username_is_unique_case_insensitively():
    User.objects.create_user(username="Ace", email="a@example.com", password="s3cure-pass-1")
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create_user(username="ace", email="b@example.com", password="s3cure-pass-1")
