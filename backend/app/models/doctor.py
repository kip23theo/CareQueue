from beanie import Document, PydanticObjectId
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampMixin


class Doctor(TimestampMixin, Document):
    clinic_id: PydanticObjectId
    user_id: PydanticObjectId
    name: str
    doctor_image: str | None = None
    specialization: str
    avg_consult_mins: int = 10
    is_available: bool = True
    delay_mins: int = 0
    completed_today: int = 0

    class Settings:
        name = "doctors"
        indexes = [
            IndexModel([("clinic_id", ASCENDING), ("is_available", ASCENDING)]),
        ]
