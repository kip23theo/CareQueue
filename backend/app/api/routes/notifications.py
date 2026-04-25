from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.models.enums import NotificationChannel
from app.models.notification import Notification
from app.models.queue_token import QueueToken

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


class SendNotificationRequest(BaseModel):
    token_id: str
    channel: NotificationChannel
    message: str | None = Field(default=None, max_length=500)


@router.get(
    "/log/{clinic_id}",
    summary="Notification log",
)
async def get_notification_log(
    clinic_id: str = Path(..., description="Clinic id"),
) -> list[dict[str, Any]]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    notifications = await Notification.find(
        Notification.clinic_id == clinic_object_id
    ).sort("-sent_at").to_list()

    rows: list[dict[str, Any]] = []
    for notification in notifications:
        token = await QueueToken.get(notification.token_id)
        rows.append(
            {
                "_id": str(notification.id),
                "token_id": str(notification.token_id),
                "clinic_id": str(notification.clinic_id),
                "channel": notification.channel,
                "message": notification.message,
                "status": notification.status,
                "sent_at": notification.sent_at,
                "patient_name": token.patient_name if token else "",
                "patient_phone": token.patient_phone if token else "",
            }
        )

    return rows


@router.post(
    "/send",
    summary="Send notification",
)
async def send_notification(payload: SendNotificationRequest) -> dict[str, str]:
    token_object_id = _parse_object_id(payload.token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    notification = Notification(
        token_id=token.id,
        clinic_id=token.clinic_id,
        channel=payload.channel,
        message=(payload.message or f"Your token A{token.token_number:02d} has been updated").strip(),
    )
    await notification.insert()

    return {"status": "sent"}
