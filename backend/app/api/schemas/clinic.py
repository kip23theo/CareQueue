from typing import Any

from pydantic import BaseModel

from app.models.enums import QueueStatus


class ClinicListItem(BaseModel):
    id: str
    name: str
    address: str
    rating: float
    avg_consult_time: int
    distance_km: float | None = None


class DoctorSummary(BaseModel):
    id: str
    name: str
    specialization: str
    avg_consult_mins: int
    is_available: bool
    delay_mins: int


class ClinicDetailResponse(BaseModel):
    id: str
    name: str
    location: dict[str, Any]
    address: str
    phone: str
    specializations: list[str]
    opening_hours: dict[str, Any]
    avg_consult_time: int
    is_open: bool
    rating: float
    delay_buffer: int
    doctors: list[DoctorSummary]


class QueueTokenLiveResponse(BaseModel):
    token_number: int
    status: QueueStatus
    est_wait_mins: int
    position: int
