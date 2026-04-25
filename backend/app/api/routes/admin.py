from datetime import datetime, timezone
from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import QueueStatus
from app.models.queue_token import QueueToken

router = APIRouter(prefix="/admin", tags=["admin"])


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_queue_token(token: QueueToken) -> dict[str, Any]:
    return {
        "id": str(token.id),
        "token_id": str(token.id),
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
        "is_walkin": True,
    }


def _serialize_clinic(clinic: Clinic) -> dict[str, Any]:
    return {
        "id": str(clinic.id),
        "name": clinic.name,
        "address": clinic.address,
        "phone": clinic.phone,
        "location": clinic.location,
        "specializations": clinic.specializations,
        "opening_hours": clinic.opening_hours,
        "avg_consult_time": clinic.avg_consult_time,
        "is_open": clinic.is_open,
        "rating": clinic.rating,
        "delay_buffer": clinic.delay_buffer,
        "verification_status": clinic.verification_status,
        "rejection_reason": clinic.rejection_reason,
    }


async def _recalculate_waiting_positions(clinic: Clinic, date: str) -> None:
    waiting_tokens = await QueueToken.find(
        QueueToken.clinic_id == clinic.id,
        QueueToken.date == date,
        QueueToken.status == QueueStatus.WAITING,
    ).sort("+joined_at").to_list()

    for idx, token in enumerate(waiting_tokens, start=1):
        expected_wait = (idx * clinic.avg_consult_time) + clinic.delay_buffer
        if token.position != idx or token.est_wait_mins != expected_wait:
            token.position = idx
            token.est_wait_mins = expected_wait
            token.updated_at = _now()
            await token.save()


class AddWalkinRequest(BaseModel):
    clinic_id: str
    doctor_id: str
    patient_name: str
    patient_phone: str
    patient_age: int | None = None
    patient_gender: str | None = None
    symptoms: str | None = None


class QueueActionRequest(BaseModel):
    clinic_id: str
    doctor_id: str


class UpdateClinicRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    specializations: list[str] | None = None
    opening_hours: dict[str, Any] | None = None
    avg_consult_time: int | None = Field(default=None, ge=1, le=180)
    is_open: bool | None = None
    delay_buffer: int | None = Field(default=None, ge=0, le=240)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


@router.get(
    "/queue",
    summary="Get clinic queue",
    description="Returns queue snapshot for clinic staff screens.",
)
async def get_admin_queue(
    clinic_id: str = Query(..., description="Clinic id"),
    date: str | None = Query(default=None, description="Queue date YYYY-MM-DD"),
) -> dict[str, Any]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    queue_date = date or _now().date().isoformat()
    tokens = await QueueToken.find(
        QueueToken.clinic_id == clinic_object_id,
        QueueToken.date == queue_date,
    ).sort("+position").to_list()

    current = next((token for token in tokens if token.status == QueueStatus.IN_CONSULTATION), None)
    if current is None:
        current = next((token for token in tokens if token.status == QueueStatus.CALLED), None)

    waiting = [token for token in tokens if token.status == QueueStatus.WAITING]
    called = [token for token in tokens if token.status == QueueStatus.CALLED]

    return {
        "clinic_id": str(clinic.id),
        "date": queue_date,
        "tokens": [_serialize_queue_token(token) for token in tokens],
        "current_token": _serialize_queue_token(current) if current else None,
        "waiting": [_serialize_queue_token(token) for token in waiting],
        "called": [_serialize_queue_token(token) for token in called],
        "completed_count": sum(1 for token in tokens if token.status == QueueStatus.COMPLETED),
        "skipped_count": sum(1 for token in tokens if token.status == QueueStatus.SKIPPED),
        "no_show_count": sum(1 for token in tokens if token.status == QueueStatus.NO_SHOW),
    }


@router.post(
    "/queue/add",
    summary="Add walk-in",
    description="Adds a walk-in patient to clinic queue.",
    status_code=status.HTTP_201_CREATED,
)
async def add_walkin(payload: AddWalkinRequest) -> dict[str, Any]:
    clinic_id = _parse_object_id(payload.clinic_id, "clinic_id")
    doctor_id = _parse_object_id(payload.doctor_id, "doctor_id")

    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    doctor = await Doctor.get(doctor_id)
    if doctor is None or doctor.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    now = _now()
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

    token = QueueToken(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        token_number=token_number,
        patient_name=payload.patient_name.strip(),
        patient_phone=payload.patient_phone.strip(),
        patient_age=payload.patient_age,
        symptoms=(payload.symptoms or "").strip(),
        status=QueueStatus.WAITING,
        position=position,
        est_wait_mins=(position * doctor.avg_consult_mins) + doctor.delay_mins + clinic.delay_buffer,
        joined_at=now,
        date=today,
    )
    await token.insert()

    return _serialize_queue_token(token)


@router.post(
    "/queue/next",
    summary="Call next token",
    description="Moves the next waiting token to called status.",
)
async def call_next(payload: QueueActionRequest) -> dict[str, Any]:
    clinic_id = _parse_object_id(payload.clinic_id, "clinic_id")
    doctor_id = _parse_object_id(payload.doctor_id, "doctor_id")

    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    doctor = await Doctor.get(doctor_id)
    if doctor is None or doctor.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    today = _now().date().isoformat()
    next_token = await QueueToken.find(
        QueueToken.clinic_id == clinic_id,
        QueueToken.doctor_id == doctor_id,
        QueueToken.date == today,
        QueueToken.status == QueueStatus.WAITING,
    ).sort("+position").first_or_none()

    if next_token is None:
        next_token = await QueueToken.find(
            QueueToken.clinic_id == clinic_id,
            QueueToken.date == today,
            QueueToken.status == QueueStatus.WAITING,
        ).sort("+position").first_or_none()

    if next_token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No waiting tokens found")

    next_token.status = QueueStatus.CALLED
    next_token.called_at = _now()
    next_token.updated_at = _now()
    await next_token.save()

    await _recalculate_waiting_positions(clinic, today)
    return _serialize_queue_token(next_token)


@router.patch(
    "/tokens/{token_id}/skip",
    summary="Skip token",
)
async def skip_token(token_id: str = Path(..., description="Token id")) -> dict[str, Any]:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    clinic = await Clinic.get(token.clinic_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    token.status = QueueStatus.SKIPPED
    token.updated_at = _now()
    await token.save()

    await _recalculate_waiting_positions(clinic, token.date)
    return {"token_id": str(token.id), "status": token.status}


@router.patch(
    "/tokens/{token_id}/emergency",
    summary="Mark emergency",
)
async def mark_emergency(token_id: str = Path(..., description="Token id")) -> dict[str, Any]:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token.status = QueueStatus.EMERGENCY
    token.position = 1
    token.est_wait_mins = 0
    token.updated_at = _now()
    await token.save()

    return _serialize_queue_token(token)


@router.patch(
    "/tokens/{token_id}/start",
    summary="Start consultation",
)
async def start_consultation(token_id: str = Path(..., description="Token id")) -> dict[str, Any]:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token.status = QueueStatus.IN_CONSULTATION
    token.consult_start = _now()
    token.updated_at = _now()
    await token.save()

    return {"token_id": str(token.id), "status": token.status}


@router.patch(
    "/tokens/{token_id}/complete",
    summary="Complete consultation",
)
async def complete_consultation(token_id: str = Path(..., description="Token id")) -> dict[str, Any]:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token.status = QueueStatus.COMPLETED
    token.consult_end = _now()
    token.updated_at = _now()
    await token.save()

    return {"token_id": str(token.id), "status": token.status}


@router.patch(
    "/tokens/{token_id}/no-show",
    summary="Mark no-show",
)
async def mark_no_show(token_id: str = Path(..., description="Token id")) -> dict[str, Any]:
    token_object_id = _parse_object_id(token_id, "token_id")
    token = await QueueToken.get(token_object_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token.status = QueueStatus.NO_SHOW
    token.updated_at = _now()
    await token.save()

    return {"token_id": str(token.id), "status": token.status}


@router.get(
    "/clinics/{clinic_id}/doctors",
    summary="Get clinic doctors for admin",
)
async def get_clinic_doctors(clinic_id: str = Path(..., description="Clinic id")) -> list[dict[str, Any]]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    doctors = await Doctor.find(Doctor.clinic_id == clinic_object_id).to_list()
    return [
        {
            "_id": str(doctor.id),
            "clinic_id": str(doctor.clinic_id),
            "user_id": str(doctor.user_id),
            "name": doctor.name,
            "specialization": doctor.specialization,
            "avg_consult_mins": doctor.avg_consult_mins,
            "is_available": doctor.is_available,
            "delay_mins": doctor.delay_mins,
            "completed_today": doctor.completed_today,
        }
        for doctor in doctors
    ]


@router.patch(
    "/clinics/{clinic_id}",
    summary="Update clinic",
)
async def update_clinic(
    payload: UpdateClinicRequest,
    clinic_id: str = Path(..., description="Clinic id"),
) -> dict[str, Any]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    if payload.name is not None:
        clinic.name = payload.name.strip()
    if payload.address is not None:
        clinic.address = payload.address.strip()
    if payload.phone is not None:
        clinic.phone = payload.phone.strip()
    if payload.specializations is not None:
        clinic.specializations = [value.strip() for value in payload.specializations if value.strip()]
    if payload.opening_hours is not None:
        clinic.opening_hours = payload.opening_hours
    if payload.avg_consult_time is not None:
        clinic.avg_consult_time = payload.avg_consult_time
    if payload.is_open is not None:
        clinic.is_open = payload.is_open
    if payload.delay_buffer is not None:
        clinic.delay_buffer = payload.delay_buffer

    if payload.latitude is not None or payload.longitude is not None:
        if payload.latitude is None or payload.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both latitude and longitude are required",
            )
        clinic.location = {
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude],
        }

    clinic.updated_at = _now()
    await clinic.save()
    return _serialize_clinic(clinic)


@router.get(
    "/clinics/{clinic_id}/analytics",
    summary="Get clinic analytics",
)
async def get_clinic_analytics(
    clinic_id: str = Path(..., description="Clinic id"),
    date: str | None = Query(default=None, description="Date in YYYY-MM-DD"),
) -> dict[str, Any]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    query_date = date or _now().date().isoformat()
    tokens = await QueueToken.find(
        QueueToken.clinic_id == clinic_object_id,
        QueueToken.date == query_date,
    ).to_list()

    total_patients = len(tokens)
    completed = sum(1 for token in tokens if token.status == QueueStatus.COMPLETED)
    cancelled = sum(1 for token in tokens if token.status == QueueStatus.CANCELLED)
    no_shows = sum(1 for token in tokens if token.status == QueueStatus.NO_SHOW)

    wait_durations: list[float] = []
    consult_durations: list[float] = []
    throughput_per_hour = [0] * 24

    for token in tokens:
        wait_end = token.called_at or token.consult_start
        if wait_end is not None:
            wait_durations.append((wait_end - token.joined_at).total_seconds() / 60)

        if token.consult_start is not None and token.consult_end is not None:
            consult_durations.append((token.consult_end - token.consult_start).total_seconds() / 60)
            throughput_per_hour[token.consult_end.hour] += 1

    avg_wait_mins = (sum(wait_durations) / len(wait_durations)) if wait_durations else 0
    avg_consult_mins = (sum(consult_durations) / len(consult_durations)) if consult_durations else clinic.avg_consult_time

    peak_count = max(throughput_per_hour) if throughput_per_hour else 0
    peak_hour = f"{throughput_per_hour.index(peak_count):02d}:00" if peak_count > 0 else ""

    return {
        "date": query_date,
        "total_patients": total_patients,
        "completed": completed,
        "cancelled": cancelled,
        "no_shows": no_shows,
        "avg_wait_mins": round(avg_wait_mins, 2),
        "avg_consult_mins": round(avg_consult_mins, 2),
        "peak_hour": peak_hour,
        "throughput_per_hour": throughput_per_hour,
    }
