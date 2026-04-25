from datetime import datetime

from beanie import Document, PydanticObjectId
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampMixin
from app.models.enums import QueueStatus


class QueueToken(TimestampMixin, Document):
    clinic_id: PydanticObjectId
    doctor_id: PydanticObjectId | None = None
    token_number: int
    patient_name: str
    patient_phone: str
    patient_age: int | None = None
    symptoms: str = ""
    status: QueueStatus = QueueStatus.WAITING
    position: int
    est_wait_mins: int = 0
    joined_at: datetime
    called_at: datetime | None = None
    consult_start: datetime | None = None
    consult_end: datetime | None = None
    date: str

    class Settings:
        name = "queue_tokens"
        indexes = [
            IndexModel([("clinic_id", ASCENDING), ("date", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("position", ASCENDING)]),
        ]
