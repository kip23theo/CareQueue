from beanie import Document, PydanticObjectId
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampMixin
from app.models.enums import UserRole


class User(TimestampMixin, Document):
    clinic_id: PydanticObjectId
    role: UserRole
    name: str
    email: str
    password_hash: str
    is_active: bool = True

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
        ]
