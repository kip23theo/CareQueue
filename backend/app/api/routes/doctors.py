from datetime import datetime, timezone
from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.models.doctor import Doctor
from app.models.enums import QueueStatus
from app.models.queue_token import QueueToken

router = APIRouter(prefix="/doctors", tags=["doctors"])


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


async def _resolve_doctor(doctor_or_user_id: str) -> Doctor:
    object_id = _parse_object_id(doctor_or_user_id, "doctor_id")
    doctor = await Doctor.get(object_id)
    if doctor is None:
        doctor = await Doctor.find_one(Doctor.user_id == object_id)

    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found",
        )
    return doctor


def _serialize_queue_token(token: QueueToken) -> dict[str, Any]:
    return {
        "id": str(token.id),
        "clinic_id": str(token.clinic_id),
        "doctor_id": str(token.doctor_id),
        "token_number": token.token_number,
        "token_display": f"A{token.token_number:02d}",
        "patient_name": token.patient_name,
        "patient_phone": token.patient_phone,
        "patient_age": token.patient_age,
        "symptoms": token.symptoms or None,
        "status": token.status,
        "position": token.position,
        "est_wait_mins": token.est_wait_mins,
        "joined_at": token.joined_at,
        "called_at": token.called_at,
        "consult_start": token.consult_start,
        "consult_end": token.consult_end,
        "date": token.date,
        "is_walkin": False,
    }


class UpdateAvailabilityRequest(BaseModel):
    is_available: bool = Field(examples=[True])


class UpdateDelayRequest(BaseModel):
    delay_mins: int = Field(examples=[5], ge=0, le=240)


class MessageResponse(BaseModel):
    message: str


@router.get(
    "/{doctor_id}/queue",
    summary="Get doctor queue",
    description="Returns current token and next five waiting tokens for a doctor.",
    responses={
        200: {"description": "Doctor queue returned successfully"},
        400: {"description": "Invalid doctor_id format"},
        404: {"description": "Doctor not found"},
    },
)
async def get_doctor_queue(
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
) -> dict[str, Any]:
    doctor = await _resolve_doctor(doctor_id)
    today = datetime.now(timezone.utc).date().isoformat()

    tokens = await QueueToken.find(
        QueueToken.doctor_id == doctor.id,
        QueueToken.date == today,
    ).sort("+position").to_list()

    current = next(
        (token for token in tokens if token.status == QueueStatus.IN_CONSULTATION),
        None,
    )
    if current is None:
        current = next((token for token in tokens if token.status == QueueStatus.CALLED), None)

    waiting = [token for token in tokens if token.status == QueueStatus.WAITING]

    return {
        "doctor_id": str(doctor.id),
        "current": _serialize_queue_token(current) if current else None,
        "next_five": [_serialize_queue_token(token) for token in waiting[:5]],
        "waiting_count": len(waiting),
        "completed_today": sum(1 for token in tokens if token.status == QueueStatus.COMPLETED),
    }


@router.patch(
    "/{doctor_id}/availability",
    response_model=MessageResponse,
    summary="Update doctor availability",
    description="Updates whether the doctor is currently available.",
)
async def update_doctor_availability(
    payload: UpdateAvailabilityRequest,
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
) -> MessageResponse:
    doctor = await _resolve_doctor(doctor_id)
    doctor.is_available = payload.is_available
    await doctor.save()
    return MessageResponse(message="Availability updated")


@router.patch(
    "/{doctor_id}/delay",
    response_model=MessageResponse,
    summary="Update doctor delay",
    description="Updates additional delay minutes for wait time calculations.",
)
async def update_doctor_delay(
    payload: UpdateDelayRequest,
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
) -> MessageResponse:
    doctor = await _resolve_doctor(doctor_id)
    doctor.delay_mins = payload.delay_mins
    await doctor.save()
    return MessageResponse(message="Delay updated")
