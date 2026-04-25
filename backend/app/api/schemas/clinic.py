from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import QueueStatus


class ClinicListItem(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    name: str = Field(examples=["Demo City Clinic"])
    address: str = Field(examples=["Connaught Place, New Delhi"])
    rating: float = Field(examples=[4.6])
    avg_consult_time: int = Field(examples=[8])
    distance_km: float | None = Field(default=None, examples=[1.4])


class DoctorSummary(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88bd3"])
    name: str = Field(examples=["Demo Dr. Priya Sharma"])
    specialization: str = Field(examples=["General Physician"])
    avg_consult_mins: int = Field(examples=[8])
    is_available: bool = Field(examples=[True])
    delay_mins: int = Field(examples=[0])


class ClinicDetailResponse(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    name: str = Field(examples=["Demo City Clinic"])
    location: dict[str, Any] = Field(
        examples=[{"type": "Point", "coordinates": [77.209, 28.6139]}]
    )
    address: str = Field(examples=["Connaught Place, New Delhi"])
    phone: str = Field(examples=["+911100000001"])
    specializations: list[str] = Field(examples=[["general", "fever", "family medicine"]])
    opening_hours: dict[str, Any] = Field(examples=[{"mon_sat": "09:00-18:00"}])
    avg_consult_time: int = Field(examples=[8])
    is_open: bool = Field(examples=[True])
    rating: float = Field(examples=[4.6])
    delay_buffer: int = Field(examples=[5])
    doctors: list[DoctorSummary]


class QueueTokenLiveResponse(BaseModel):
    token_number: int = Field(examples=[101])
    status: QueueStatus = Field(examples=[QueueStatus.WAITING])
    est_wait_mins: int = Field(examples=[24])
    position: int = Field(examples=[3])
