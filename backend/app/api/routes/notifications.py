from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
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


def _serialize_notification(
    *,
    notification: Notification,
    token: QueueToken | None,
    clinic_name: str | None,
) -> dict[str, Any]:
    return {
        "_id": str(notification.id),
        "token_id": str(notification.token_id),
        "clinic_id": str(notification.clinic_id),
        "clinic_name": clinic_name,
        "channel": notification.channel,
        "message": notification.message,
        "status": notification.status,
        "sent_at": notification.sent_at,
        "patient_name": token.patient_name if token else "",
        "patient_phone": token.patient_phone if token else "",
        "token_display": f"A{token.token_number:02d}" if token else None,
    }


class SendNotificationRequest(BaseModel):
    token_id: str
    channel: NotificationChannel
    message: str | None = Field(default=None, max_length=500)


@router.get(
    "/log/{clinic_id}",
    summary="Notification log for clinic staff",
)
async def get_notification_log(
    clinic_id: str = Path(..., description="Clinic id"),
) -> list[dict[str, Any]]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    notifications = await Notification.find(
        Notification.clinic_id == clinic_object_id
    ).sort("-sent_at").to_list()

    token_ids = sorted({notification.token_id for notification in notifications})
    tokens = await QueueToken.find({"_id": {"$in": token_ids}}).to_list() if token_ids else []
    token_by_id = {str(token.id): token for token in tokens}

    clinic = await Clinic.get(clinic_object_id)
    clinic_name = clinic.name if clinic else None

    return [
        _serialize_notification(
            notification=notification,
            token=token_by_id.get(str(notification.token_id)),
            clinic_name=clinic_name,
        )
        for notification in notifications
    ]


@router.get(
    "/patient/{patient_user_id}",
    summary="Notification feed for patient app",
)
async def get_patient_notifications(
    patient_user_id: str = Path(..., description="Patient user id"),
) -> list[dict[str, Any]]:
    patient_object_id = _parse_object_id(patient_user_id, "patient_user_id")
    tokens = await QueueToken.find(
        QueueToken.patient_user_id == patient_object_id
    ).sort("-joined_at").to_list()

    if not tokens:
        return []

    token_by_id = {str(token.id): token for token in tokens}
    token_ids = [token.id for token in tokens]
    clinic_ids = sorted({token.clinic_id for token in tokens})
    clinics = await Clinic.find({"_id": {"$in": clinic_ids}}).to_list() if clinic_ids else []
    clinic_by_id = {str(clinic.id): clinic for clinic in clinics}

    notifications = await Notification.find(
        {"token_id": {"$in": token_ids}}
    ).sort("-sent_at").to_list()

    return [
        _serialize_notification(
            notification=notification,
            token=token_by_id.get(str(notification.token_id)),
            clinic_name=(
                clinic_by_id.get(str(notification.clinic_id)).name
                if clinic_by_id.get(str(notification.clinic_id))
                else None
            ),
        )
        for notification in notifications
    ]


@router.get(
    "/token/{token_id}",
    summary="Notification feed for a token",
)
async def get_token_notifications(
    token_id: str = Path(..., description="Token id"),
) -> list[dict[str, Any]]:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    clinic = await Clinic.get(token.clinic_id)
    notifications = await Notification.find(
        Notification.token_id == token_object_id
    ).sort("-sent_at").to_list()

    return [
        _serialize_notification(
            notification=notification,
            token=token,
            clinic_name=clinic.name if clinic else None,
        )
        for notification in notifications
    ]


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
