from typing import Any

from beanie import Document
from pydantic import Field
from pymongo import IndexModel

from app.models.base import TimestampMixin


class Clinic(TimestampMixin, Document):
    name: str
    location: dict[str, Any]
    address: str
    phone: str
    specializations: list[str] = Field(default_factory=list)
    opening_hours: dict[str, Any] = Field(default_factory=dict)
    avg_consult_time: int = 10
    is_open: bool = True
    rating: float = 0.0
    delay_buffer: int = 0

    class Settings:
        name = "clinics"
        indexes = [
            IndexModel([("location", "2dsphere")]),
        ]
