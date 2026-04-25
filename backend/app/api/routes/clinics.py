from fastapi import APIRouter

from app.api.schemas.clinic import ClinicListItem
from app.models.clinic import Clinic

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


@router.get("/{clinic_id}")
async def get_clinic_detail(clinic_id: str) -> dict[str, str]:
    return {"clinic_id": clinic_id}


@router.get("/{clinic_id}/queue/live")
async def get_live_queue(clinic_id: str) -> dict[str, list]:
    return {"queue": []}
