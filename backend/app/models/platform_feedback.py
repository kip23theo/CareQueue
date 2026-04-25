from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.base import TimestampMixin
from app.models.enums import UserRole


class PlatformFeedback(TimestampMixin, Document):
    user_id: PydanticObjectId
    user_role: UserRole
    user_name: str
    user_email: str
    clinic_id: PydanticObjectId | None = None
    clinic_name: str | None = None
    rating: int = Field(ge=1, le=5)
    comment: str = ""

    class Settings:
        name = "platform_feedback"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("user_role", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ]
