from io import BytesIO
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

AVATAR = "/api/v1/me/avatar/"


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path  # Django's file storage picks the change up automatically
    return tmp_path


def image_file(fmt="PNG", size=(800, 600), name="me.png", mode="RGB"):
    buffer = BytesIO()
    Image.new(mode, size, "red" if mode == "RGB" else 128).save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{fmt.lower()}")


@pytest.mark.django_db
def test_avatar_requires_authentication(api_client):
    assert api_client.post(AVATAR, {"file": image_file()}, format="multipart").status_code == 401


@pytest.mark.django_db
def test_upload_resizes_and_reencodes_to_jpeg(auth_client, media_root):
    response = auth_client.post(AVATAR, {"file": image_file(size=(2000, 1000))}, format="multipart")
    assert response.status_code == 200
    assert "/media/avatars/" in response.json()["avatar_url"]
    stored = Path(media_root) / "avatars" / f"{auth_client.user.id}.jpg"
    with Image.open(stored) as img:
        assert img.format == "JPEG"
        assert max(img.size) == 512


@pytest.mark.django_db
def test_new_upload_replaces_the_old_file(auth_client, media_root):
    auth_client.post(AVATAR, {"file": image_file(size=(100, 100))}, format="multipart")
    auth_client.post(AVATAR, {"file": image_file(size=(300, 300), fmt="WEBP", name="me.webp")}, format="multipart")
    files = list((Path(media_root) / "avatars").iterdir())
    assert [f.name for f in files] == [f"{auth_client.user.id}.jpg"]


@pytest.mark.django_db
def test_rejects_a_file_that_is_not_an_image(auth_client):
    fake = SimpleUploadedFile("me.png", b"<?php echo 1; ?>", content_type="image/png")
    assert auth_client.post(AVATAR, {"file": fake}, format="multipart").status_code == 400


@pytest.mark.django_db
def test_rejects_unsupported_image_formats(auth_client):
    gif = image_file(fmt="GIF", name="me.gif")
    assert auth_client.post(AVATAR, {"file": gif}, format="multipart").status_code == 400


@pytest.mark.django_db
def test_rejects_files_over_the_size_limit(auth_client):
    big = SimpleUploadedFile("me.png", b"0" * (5 * 1024 * 1024 + 1), content_type="image/png")
    assert auth_client.post(AVATAR, {"file": big}, format="multipart").status_code == 400


@pytest.mark.django_db
def test_rejects_huge_dimensions(auth_client):
    huge = image_file(size=(5200, 5200), mode="L")  # 27M pixels, tiny file
    assert auth_client.post(AVATAR, {"file": huge}, format="multipart").status_code == 400


@pytest.mark.django_db
def test_missing_file_is_a_400(auth_client):
    assert auth_client.post(AVATAR, {}, format="multipart").status_code == 400


@pytest.mark.django_db
def test_delete_removes_file_and_clears_url(auth_client, media_root):
    auth_client.post(AVATAR, {"file": image_file()}, format="multipart")
    response = auth_client.delete(AVATAR)
    assert response.status_code == 200
    assert response.json()["avatar_url"] == ""
    assert not (Path(media_root) / "avatars" / f"{auth_client.user.id}.jpg").exists()
