from datetime import datetime, timezone

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status

from app.api.schemas.tokens import (
    CancelTokenResponse,
    JoinQueueRequest,
    JoinQueueResponse,
    TokenStatusResponse,
)
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import QueueStatus
from app.models.queue_token import QueueToken

router = APIRouter()


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


@router.post(
    "/join",
    response_model=JoinQueueResponse,
    summary="Join clinic queue",
    description="Create a patient queue token for a clinic and return live queue position.",
    responses={
        201: {"description": "Queue token created successfully"},
        400: {"description": "Invalid clinic_id or doctor_id format"},
        404: {"description": "Clinic or doctor not found"},
    },
    status_code=status.HTTP_201_CREATED,
)
async def join_queue(request: JoinQueueRequest) -> JoinQueueResponse:
    clinic_id = _parse_object_id(request.clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        )

    doctor: Doctor | None = None
    if request.doctor_id:
        doctor_id = _parse_object_id(request.doctor_id, "doctor_id")
        doctor = await Doctor.get(doctor_id)
        if doctor is None or doctor.clinic_id != clinic_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found",
            )
    else:
        doctor = await Doctor.find(
            Doctor.clinic_id == clinic_id,
            {"is_available": True},
        ).first_or_none()
        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found",
            )

    now = datetime.now(timezone.utc)
    today = now.date().isoformat()

    latest_token = await QueueToken.find(
        QueueToken.clinic_id == clinic_id,
        QueueToken.date == today,
    ).sort("-token_number").first_or_none()
    token_number = (latest_token.token_number + 1) if latest_token else 1

    latest_waiting = await QueueToken.find(
        QueueToken.clinic_id == clinic_id,
        QueueToken.date == today,
        QueueToken.status == QueueStatus.WAITING,
    ).sort("-position").first_or_none()
    position = (latest_waiting.position + 1) if latest_waiting else 1

    avg_consult_mins = doctor.avg_consult_mins if doctor else clinic.avg_consult_time
    est_wait_mins = position * avg_consult_mins

    token = QueueToken(
        clinic_id=clinic_id,
        doctor_id=doctor.id,
        token_number=token_number,
        patient_name=request.patient_name,
        patient_phone=request.patient_phone,
        patient_age=request.patient_age,
        symptoms=request.symptoms or "",
        status=QueueStatus.WAITING,
        position=position,
        est_wait_mins=est_wait_mins,
        joined_at=now,
        date=today,
    )
    await token.insert()

    return JoinQueueResponse(
        token_id=str(token.id),
        clinic_id=str(token.clinic_id),
        doctor_id=str(token.doctor_id),
        token_number=token.token_number,
        status=token.status,
        position=token.position,
        est_wait_mins=token.est_wait_mins,
        joined_at=token.joined_at,
        updated_at=token.updated_at,
    )


@router.get(
    "/{token_id}/status",
    response_model=TokenStatusResponse,
    summary="Get token status",
    description="Return live patient token status, queue position, ETA, and timestamps.",
    responses={
        200: {"description": "Token status returned successfully"},
        400: {"description": "Invalid token_id format"},
        404: {"description": "Token not found"},
    },
)
async def get_token_status(token_id: str) -> TokenStatusResponse:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    return TokenStatusResponse(
        token_id=str(token.id),
        clinic_id=str(token.clinic_id),
        doctor_id=str(token.doctor_id) if token.doctor_id else None,
        token_number=token.token_number,
        status=token.status,
        position=token.position,
        est_wait_mins=token.est_wait_mins,
        joined_at=token.joined_at,
        updated_at=token.updated_at,
    )


@router.patch(
    "/{token_id}/cancel",
    response_model=CancelTokenResponse,
    summary="Cancel token",
    description="Marks a patient token as cancelled.",
)
async def cancel_token(token_id: str) -> CancelTokenResponse:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    token.status = QueueStatus.CANCELLED
    token.updated_at = datetime.now(timezone.utc)
    await token.save()

    return CancelTokenResponse(
        token_id=str(token.id),
        status=token.status,
        updated_at=token.updated_at,
    )
