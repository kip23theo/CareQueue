from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import DESCENDING, IndexModel

from app.models.base import TimestampMixin
from app.models.enums import MedicalDocumentType


class MedicalDocument(TimestampMixin, Document):
    patient_user_id: PydanticObjectId
    clinic_id: PydanticObjectId | None = None
    medical_history_id: PydanticObjectId | None = None
    uploaded_by_user_id: PydanticObjectId | None = None

    title: str
    document_type: MedicalDocumentType = MedicalDocumentType.OTHER
    file_url: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    issued_on: datetime | None = None

    class Settings:
        name = "medical_documents"
        indexes = [
            IndexModel([("patient_user_id", DESCENDING), ("created_at", DESCENDING)]),
            IndexModel([("clinic_id", DESCENDING)]),
            IndexModel([("medical_history_id", DESCENDING)]),
        ]
