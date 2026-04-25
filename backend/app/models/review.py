from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampMixin
from app.models.enums import ReviewTargetType


class Review(TimestampMixin, Document):
    clinic_id: PydanticObjectId
    doctor_id: PydanticObjectId | None = None
    patient_user_id: PydanticObjectId | None = None
    token_id: PydanticObjectId | None = None
    target_type: ReviewTargetType = ReviewTargetType.CLINIC
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    patient_name: str | None = None

    class Settings:
        name = "reviews"
        indexes = [
            IndexModel([("clinic_id", ASCENDING)]),
            IndexModel([("doctor_id", ASCENDING)]),
            IndexModel([("target_type", ASCENDING)]),
        ]
