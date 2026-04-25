from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TimestampMixin, utc_now
from app.models.enums import NotificationChannel, NotificationStatus


class Notification(TimestampMixin, Document):
    token_id: PydanticObjectId
    clinic_id: PydanticObjectId
    channel: NotificationChannel
    message: str
    status: NotificationStatus = NotificationStatus.SENT
    sent_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "notifications"
        indexes = [
            IndexModel([("token_id", ASCENDING), ("sent_at", ASCENDING)]),
        ]
