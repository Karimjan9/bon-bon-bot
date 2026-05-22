from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from app.web.main import MAX_OPTIMIZED_IMAGE_UPLOAD_BYTES, optimize_image_upload


def make_image_bytes(image_format: str = "PNG") -> bytes:
    image = Image.new("RGBA", (1600, 1000), (210, 40, 70, 255))
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def test_optimize_image_upload_accepts_source_images() -> None:
    optimized, content_type, extension = optimize_image_upload(make_image_bytes())

    assert content_type in {"image/webp", "image/jpeg"}
    assert extension in {".webp", ".jpg"}
    assert optimized
    assert len(optimized) <= MAX_OPTIMIZED_IMAGE_UPLOAD_BYTES


def test_optimize_image_upload_rejects_non_images() -> None:
    with pytest.raises(HTTPException):
        optimize_image_upload(b"not an image")
