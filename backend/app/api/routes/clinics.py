import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, Query, Request, status
from fastapi.responses import StreamingResponse

from app.api.schemas.clinic import (
    ClinicDetailResponse,
    ClinicListItem,
    DoctorSummary,
    LiveQueueSnapshotResponse,
)
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import QueueStatus
from app.models.queue_token import QueueToken

router = APIRouter()


def _parse_clinic_id(clinic_id: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(clinic_id)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid clinic_id",
        ) from exc


def _clinic_distance_score(clinic: Clinic, lat: float, lng: float) -> float:
    coordinates = clinic.location.get("coordinates", [])
    if len(coordinates) != 2:
        return 0.0

    clinic_lng, clinic_lat = coordinates
    return abs(float(clinic_lat) - lat) + abs(float(clinic_lng) - lng)


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


@router.get(
    "/nearby",
    response_model=list[ClinicListItem],
    summary="Get nearby clinics",
    description=(
        "Returns patient-facing clinic cards sorted by approximate distance. "
        "Current distance sorting is a lightweight placeholder until full "
        "MongoDB GeoJSON radius filtering is enabled."
    ),
    responses={
        200: {"description": "Nearby clinics returned successfully"},
    },
)
async def get_nearby_clinics(
    lat: float = Query(..., description="Patient latitude", examples=[28.6139]),
    lng: float = Query(..., description="Patient longitude", examples=[77.2090]),
    radius: float = Query(5.0, description="Search radius in kilometers", examples=[5.0]),
) -> list[ClinicListItem]:
    clinics = await Clinic.find_all().to_list()
    sorted_clinics = sorted(clinics, key=lambda clinic: _clinic_distance_score(clinic, lat, lng))

    return [
        ClinicListItem(
            id=str(clinic.id),
            name=clinic.name,
            address=clinic.address,
            rating=clinic.rating,
            avg_consult_time=clinic.avg_consult_time,
            distance_km=None,
        )
        for clinic in sorted_clinics
    ]


@router.get(
    "/{clinic_id}",
    response_model=ClinicDetailResponse,
    summary="Get clinic details",
    description="Returns full clinic profile details and doctors linked to the clinic.",
    responses={
        200: {"description": "Clinic details returned successfully"},
        400: {"description": "Invalid clinic_id format"},
        404: {"description": "Clinic not found"},
    },
)
async def get_clinic_detail(
    clinic_id: str = Path(..., description="MongoDB ObjectId of the clinic")
) -> ClinicDetailResponse:
    clinic_object_id = _parse_clinic_id(clinic_id)

    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        )

    doctors = await Doctor.find(Doctor.clinic_id == clinic_object_id).to_list()

    return ClinicDetailResponse(
        id=str(clinic.id),
        name=clinic.name,
        location=clinic.location,
        address=clinic.address,
        phone=clinic.phone,
        specializations=clinic.specializations,
        opening_hours=clinic.opening_hours,
        avg_consult_time=clinic.avg_consult_time,
        is_open=clinic.is_open,
        rating=clinic.rating,
        delay_buffer=clinic.delay_buffer,
        doctors=[
            DoctorSummary(
                id=str(doctor.id),
                name=doctor.name,
                specialization=doctor.specialization,
                avg_consult_mins=doctor.avg_consult_mins,
                is_available=doctor.is_available,
                delay_mins=doctor.delay_mins,
            )
            for doctor in doctors
        ],
    )


@router.get(
    "/{clinic_id}/queue/live",
    response_model=LiveQueueSnapshotResponse,
    summary="Get live clinic queue",
    description=(
        "Returns queue snapshot for a clinic including current token, waiting/called "
        "lists, and all tokens for today."
    ),
    responses={
        200: {"description": "Live queue returned successfully"},
        400: {"description": "Invalid clinic_id format"},
        404: {"description": "Clinic not found"},
    },
)
async def get_live_queue(
    clinic_id: str = Path(..., description="MongoDB ObjectId of the clinic")
) -> LiveQueueSnapshotResponse:
    clinic_object_id = _parse_clinic_id(clinic_id)

    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        )

    today = datetime.now(timezone.utc).date().isoformat()
    tokens_today = await QueueToken.find(
        QueueToken.clinic_id == clinic_object_id,
        QueueToken.date == today,
    ).sort("+position").to_list()

    current = next(
        (token for token in tokens_today if token.status == QueueStatus.IN_CONSULTATION),
        None,
    )
    if current is None:
        current = next((token for token in tokens_today if token.status == QueueStatus.CALLED), None)

    waiting = [token for token in tokens_today if token.status == QueueStatus.WAITING]
    called = [token for token in tokens_today if token.status == QueueStatus.CALLED]

    return LiveQueueSnapshotResponse(
        clinic_id=str(clinic.id),
        date=today,
        tokens=[_serialize_queue_token(token) for token in tokens_today],
        current_token=_serialize_queue_token(current) if current else None,
        waiting=[_serialize_queue_token(token) for token in waiting],
        called=[_serialize_queue_token(token) for token in called],
        completed_count=sum(1 for token in tokens_today if token.status == QueueStatus.COMPLETED),
        skipped_count=sum(1 for token in tokens_today if token.status == QueueStatus.SKIPPED),
        no_show_count=sum(1 for token in tokens_today if token.status == QueueStatus.NO_SHOW),
    )


@router.get(
    "/{clinic_id}/doctors",
    summary="Get clinic doctors",
    description="Returns doctor list for a clinic in frontend-friendly shape.",
    responses={
        200: {"description": "Doctor list returned successfully"},
        400: {"description": "Invalid clinic_id format"},
        404: {"description": "Clinic not found"},
    },
)
async def get_clinic_doctors(
    clinic_id: str = Path(..., description="MongoDB ObjectId of the clinic")
) -> list[dict[str, Any]]:
    clinic_object_id = _parse_clinic_id(clinic_id)

    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        )

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


@router.get(
    "/{clinic_id}/sse",
    summary="Clinic queue live SSE",
    description="SSE stream for live queue updates.",
    responses={
        200: {"description": "SSE stream opened"},
        400: {"description": "Invalid clinic_id format"},
        404: {"description": "Clinic not found"},
    },
)
async def clinic_queue_sse(
    request: Request,
    clinic_id: str = Path(..., description="MongoDB ObjectId of the clinic"),
) -> StreamingResponse:
    clinic_object_id = _parse_clinic_id(clinic_id)
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        )

    async def event_generator():
        initial_event = {
            "type": "queue_updated",
            "clinic_id": str(clinic_object_id),
            "payload": {},
        }
        yield f"data: {json.dumps(initial_event)}\n\n"

        while True:
            if await request.is_disconnected():
                break
            heartbeat_event = {
                "type": "queue_updated",
                "clinic_id": str(clinic_object_id),
                "payload": {"heartbeat": True},
            }
            yield f"data: {json.dumps(heartbeat_event)}\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
