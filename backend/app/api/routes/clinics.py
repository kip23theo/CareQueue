from fastapi import APIRouter

router = APIRouter()


@router.get("/nearby")
async def get_nearby_clinics() -> dict[str, list]:
    return {"clinics": []}


@router.get("/{clinic_id}")
async def get_clinic_detail(clinic_id: str) -> dict[str, str]:
    return {"clinic_id": clinic_id}


@router.get("/{clinic_id}/queue/live")
async def get_live_queue(clinic_id: str) -> dict[str, list]:
    return {"queue": []}
