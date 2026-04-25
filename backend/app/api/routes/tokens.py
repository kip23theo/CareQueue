from datetime import datetime, timezone
from typing import Any

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
from app.models.enums import QueueStatus, UserRole
from app.models.queue_token import QueueToken
from app.models.user import User
from app.services.queue_service import compute_wait_minutes, recalculate_waiting_positions

router = APIRouter()


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _serialize_queue_token(token: QueueToken) -> dict[str, Any]:
    return {
        "id": str(token.id),
        "clinic_id": str(token.clinic_id),
        "doctor_id": str(token.doctor_id) if token.doctor_id else None,
        "patient_user_id": str(token.patient_user_id) if token.patient_user_id else None,
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
        "payment_amount": token.payment_amount,
        "payment_method": token.payment_method,
        "payment_notes": token.payment_notes or None,
        "payment_recorded_at": token.payment_recorded_at,
        "payment_recorded_by_role": token.payment_recorded_by_role,
        "payment_recorded_by_name": token.payment_recorded_by_name,
        "is_walkin": False,
    }


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

    patient_user_id: PydanticObjectId | None = None
    if request.patient_user_id:
        patient_user_id = _parse_object_id(request.patient_user_id, "patient_user_id")
        patient = await User.get(patient_user_id)
        if patient is None or patient.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found",
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

    est_wait_mins = compute_wait_minutes(position=position, clinic=clinic, doctor=doctor)

    token = QueueToken(
        clinic_id=clinic_id,
        doctor_id=doctor.id,
        patient_user_id=patient_user_id,
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
    await recalculate_waiting_positions(clinic_id, today)
    token = await QueueToken.get(token.id) or token

    return JoinQueueResponse(
        token_id=str(token.id),
        clinic_id=str(token.clinic_id),
        doctor_id=str(token.doctor_id) if token.doctor_id else None,
        patient_user_id=str(token.patient_user_id) if token.patient_user_id else None,
        token_number=token.token_number,
        status=token.status,
        position=token.position,
        est_wait_mins=token.est_wait_mins,
        joined_at=token.joined_at,
        updated_at=token.updated_at,
    )


@router.get(
    "/patient/{patient_user_id}",
    summary="List patient tokens",
    description="Returns queue tokens created by a specific patient ordered by most recent first.",
    responses={
        200: {"description": "Patient tokens returned successfully"},
        400: {"description": "Invalid patient_user_id format"},
        404: {"description": "Patient not found"},
    },
)
async def list_patient_tokens(
    patient_user_id: str,
    include_terminal: bool = True,
    limit: int = 100,
) -> list[dict[str, Any]]:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    patient = await User.get(patient_id)
    if patient is None or patient.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    safe_limit = max(1, min(limit, 200))
    tokens = await QueueToken.find(
        QueueToken.patient_user_id == patient_id,
    ).sort("-joined_at").limit(safe_limit).to_list()

    if include_terminal:
        return [_serialize_queue_token(token) for token in tokens]

    active_statuses = {
        QueueStatus.WAITING,
        QueueStatus.CALLED,
        QueueStatus.IN_CONSULTATION,
        QueueStatus.EMERGENCY,
    }
    return [_serialize_queue_token(token) for token in tokens if token.status in active_statuses]


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
        patient_user_id=str(token.patient_user_id) if token.patient_user_id else None,
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
    description="Cancel a WAITING or CALLED token. Reorders remaining queue positions.",
    responses={
        200: {"description": "Token cancelled successfully"},
        400: {"description": "Invalid token_id or token cannot be cancelled"},
        404: {"description": "Token not found"},
    },
)
async def cancel_token(token_id: str) -> CancelTokenResponse:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found",
        )

    terminal = {QueueStatus.COMPLETED, QueueStatus.CANCELLED, QueueStatus.NO_SHOW}
    if token.status in terminal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Token is already {token.status.value}",
        )

    if token.status not in {QueueStatus.WAITING, QueueStatus.CALLED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel token with status {token.status.value}",
        )

    now = datetime.now(timezone.utc)

    token.status = QueueStatus.CANCELLED
    token.position = 0
    token.est_wait_mins = 0
    token.updated_at = now
    await token.save()

    await recalculate_waiting_positions(token.clinic_id, token.date)

    return CancelTokenResponse(
        token_id=str(token.id),
        status=token.status,
        updated_at=token.updated_at,
    )
