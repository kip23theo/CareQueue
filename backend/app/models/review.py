from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampMixin


class Review(TimestampMixin, Document):
    clinic_id: PydanticObjectId
    token_id: PydanticObjectId
    rating: int = Field(ge=1, le=5)
    comment: str = ""

    class Settings:
        name = "reviews"
        indexes = [
            IndexModel([("clinic_id", ASCENDING)]),
        ]
