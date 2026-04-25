from datetime import datetime, timezone
from typing import Any

import gridfs
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.db.mongodb import get_database

router = APIRouter(prefix="/uploads", tags=["uploads"])

GRIDFS_BUCKET_NAME = "image_uploads"
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _bucket() -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(get_database(), bucket_name=GRIDFS_BUCKET_NAME)


@router.post(
    "/image",
    summary="Upload image",
    description="Upload an image file and store it in MongoDB GridFS.",
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(file: UploadFile = File(...)) -> dict[str, str]:
    content_type = (file.content_type or "").strip().lower()
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed",
        )

    image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 5 MB or smaller",
        )

    filename = (file.filename or "image").strip() or "image"
    metadata: dict[str, Any] = {
        "content_type": content_type,
        "uploaded_at": datetime.now(timezone.utc),
    }

    file_id = await _bucket().upload_from_stream(
        filename=filename,
        source=image_bytes,
        metadata=metadata,
    )

    return {
        "file_id": str(file_id),
        "file_path": f"/uploads/image/{file_id}",
    }


@router.get(
    "/image/{file_id}",
    summary="Get uploaded image",
    description="Fetch an uploaded image by id from MongoDB GridFS.",
)
async def get_uploaded_image(file_id: str) -> Response:
    try:
        object_id = ObjectId(file_id)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image id",
        ) from exc

    try:
        stream = await _bucket().open_download_stream(object_id)
    except gridfs.errors.NoFile as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        ) from exc

    media_type = "application/octet-stream"
    metadata = stream.metadata if isinstance(stream.metadata, dict) else {}
    content_type = metadata.get("content_type")
    if isinstance(content_type, str) and content_type.strip():
        media_type = content_type

    return Response(
        content=await stream.read(),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
