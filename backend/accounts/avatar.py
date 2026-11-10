"""Validate and normalise uploaded avatar images.

Never store the uploaded bytes as-is: decode the image, check it, and write a
fresh JPEG. That strips metadata and rejects files that only pretend to be images.
"""
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 25_000_000  # guards against decompression bombs
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
AVATAR_SIZE = 512


class InvalidAvatar(ValueError):
    pass


def process_avatar(upload) -> ContentFile:
    if upload.size > MAX_UPLOAD_BYTES:
        raise InvalidAvatar("Image is too large (maximum 5 MB).")
    try:
        with Image.open(upload) as probe:
            if probe.format not in ALLOWED_FORMATS:
                raise InvalidAvatar("Use a JPEG, PNG or WebP image.")
            if probe.width * probe.height > MAX_PIXELS:
                raise InvalidAvatar("Image dimensions are too large.")
            probe.verify()
        upload.seek(0)
        with Image.open(upload) as image:
            image = image.convert("RGB")
            image.thumbnail((AVATAR_SIZE, AVATAR_SIZE))
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=85)
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
        raise InvalidAvatar("This file is not a valid image.")
    return ContentFile(buffer.getvalue())
