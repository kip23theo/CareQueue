from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import DESCENDING, IndexModel

from app.models.base import TimestampMixin


class MedicalHistory(TimestampMixin, Document):
    patient_user_id: PydanticObjectId
    clinic_id: PydanticObjectId | None = None
    doctor_id: PydanticObjectId | None = None

    title: str
    diagnosis: str = ""
    notes: str = ""
    prescriptions: list[str] = Field(default_factory=list)
    vitals: dict[str, str] = Field(default_factory=dict)

    visit_date: datetime
    follow_up_date: datetime | None = None

    class Settings:
        name = "medical_history"
        indexes = [
            IndexModel([("patient_user_id", DESCENDING), ("visit_date", DESCENDING)]),
            IndexModel([("clinic_id", DESCENDING)]),
            IndexModel([("doctor_id", DESCENDING)]),
        ]
