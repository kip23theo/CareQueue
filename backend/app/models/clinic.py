from typing import Any

from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.models.base import TimestampMixin
from app.models.enums import ClinicVerificationStatus


class Clinic(TimestampMixin, Document):
    name: str
    location: dict[str, Any]
    google_maps_link: str | None = None
    address: str
    phone: str
    specializations: list[str] = Field(default_factory=list)
    opening_hours: dict[str, Any] = Field(default_factory=dict)
    avg_consult_time: int = 10
    is_open: bool = True
    rating: float = 0.0
    delay_buffer: int = 0
    verification_status: ClinicVerificationStatus = ClinicVerificationStatus.PENDING
    verified_at: datetime | None = None
    verified_by: PydanticObjectId | None = None
    rejection_reason: str | None = None

    class Settings:
        name = "clinics"
        indexes = [
            IndexModel([("location", "2dsphere")]),
            IndexModel([("verification_status", 1)]),
        ]
