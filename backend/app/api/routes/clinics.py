from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, status

from app.api.schemas.clinic import (
    ClinicDetailResponse,
    ClinicListItem,
    DoctorSummary,
    QueueTokenResponse,
)
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import QueueStatus
from app.models.queue_token import QueueToken

router = APIRouter()


def _clinic_distance_score(clinic: Clinic, lat: float, lng: float) -> float:
    coordinates = clinic.location.get("coordinates", [])
    if len(coordinates) != 2:
        return 0.0

    clinic_lng, clinic_lat = coordinates
    return abs(float(clinic_lat) - lat) + abs(float(clinic_lng) - lng)


@router.get("/nearby", response_model=list[ClinicListItem])
async def get_nearby_clinics(
    lat: float,
    lng: float,
    radius: float = 5.0,
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


@router.get("/{clinic_id}", response_model=ClinicDetailResponse)
async def get_clinic_detail(clinic_id: str) -> ClinicDetailResponse:
    try:
        clinic_object_id = PydanticObjectId(clinic_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        ) from exc

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


@router.get("/{clinic_id}/queue/live", response_model=list[QueueTokenResponse])
async def get_live_queue(clinic_id: str) -> list[QueueTokenResponse]:
    try:
        clinic_object_id = PydanticObjectId(clinic_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        ) from exc

    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinic not found",
        )

    active_statuses = [
        QueueStatus.WAITING,
        QueueStatus.CALLED,
        QueueStatus.IN_CONSULTATION,
        QueueStatus.SKIPPED,
        QueueStatus.EMERGENCY,
    ]
    tokens = await QueueToken.find(
        QueueToken.clinic_id == clinic_object_id,
        {"status": {"$in": [queue_status.value for queue_status in active_statuses]}},
    ).sort("+position").to_list()

    return [
        QueueTokenResponse(
            token_number=token.token_number,
            status=token.status,
            est_wait_mins=token.est_wait_mins,
            position=token.position,
        )
        for token in tokens
    ]
