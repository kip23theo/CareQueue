from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import QueueStatus


class ClinicListItem(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    name: str = Field(examples=["Demo City Clinic"])
    clinic_image: str | None = Field(
        default=None,
        examples=["https://images.unsplash.com/photo-1586773860418-d37222d8fce3"],
    )
    address: str = Field(examples=["Connaught Place, New Delhi"])
    rating: float = Field(examples=[4.6])
    avg_consult_time: int = Field(examples=[8])
    distance_km: float | None = Field(default=None, examples=[1.4])
    specializations: list[str] = Field(default_factory=list, examples=[["general", "pediatrics"]])
    is_open: bool = Field(examples=[True])
    queue_length: int = Field(default=0, examples=[5])
    est_wait_mins: int = Field(default=0, examples=[30])


class DoctorSummary(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88bd3"])
    name: str = Field(examples=["Demo Dr. Priya Sharma"])
    doctor_image: str | None = Field(
        default=None,
        examples=["https://images.unsplash.com/photo-1612349317150-e413f6a5b16d"],
    )
    specialization: str = Field(examples=["General Physician"])
    avg_consult_mins: int = Field(examples=[8])
    is_available: bool = Field(examples=[True])
    delay_mins: int = Field(examples=[0])


class ClinicDetailResponse(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    name: str = Field(examples=["Demo City Clinic"])
    clinic_image: str | None = Field(
        default=None,
        examples=["https://images.unsplash.com/photo-1586773860418-d37222d8fce3"],
    )
    location: dict[str, Any] = Field(
        examples=[{"type": "Point", "coordinates": [77.209, 28.6139]}]
    )
    google_maps_link: str | None = Field(
        default=None,
        examples=["https://www.google.com/maps?q=28.6139,77.2090"],
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


class QueueTokenSnapshot(BaseModel):
    id: str = Field(examples=["69ec6f6ac3c51735cea88be0"])
    clinic_id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    doctor_id: str = Field(examples=["69ec6f6ac3c51735cea88bd3"])
    token_number: int = Field(examples=[101])
    token_display: str = Field(examples=["A101"])
    patient_name: str = Field(examples=["Demo Patient"])
    patient_phone: str = Field(examples=["+919999999999"])
    patient_age: int | None = Field(default=None, examples=[25])
    symptoms: str | None = Field(default=None, examples=["Fever and headache"])
    status: QueueStatus = Field(examples=[QueueStatus.WAITING])
    position: int = Field(examples=[3])
    est_wait_mins: int = Field(examples=[24])
    joined_at: datetime
    called_at: datetime | None = None
    consult_start: datetime | None = None
    consult_end: datetime | None = None
    date: str = Field(examples=["2026-04-25"])
    is_walkin: bool = Field(default=False, examples=[True])


class LiveQueueSnapshotResponse(BaseModel):
    clinic_id: str = Field(examples=["69ec6f6ac3c51735cea88bcb"])
    date: str = Field(examples=["2026-04-25"])
    tokens: list[QueueTokenSnapshot]
    current_token: QueueTokenSnapshot | None = None
    waiting: list[QueueTokenSnapshot]
    called: list[QueueTokenSnapshot]
    completed_count: int = Field(examples=[4])
    skipped_count: int = Field(examples=[1])
    no_show_count: int = Field(examples=[0])
