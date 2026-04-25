from app.models.enums import NotificationChannel
from app.models.notification import Notification
from app.models.queue_token import QueueToken


async def create_notification(
    *,
    token: QueueToken,
    message: str,
    channel: NotificationChannel = NotificationChannel.PUSH,
) -> Notification | None:
    clean_message = message.strip()
    if not clean_message:
        return None

    notification = Notification(
        token_id=token.id,
        clinic_id=token.clinic_id,
        channel=channel,
        message=clean_message,
    )
    await notification.insert()
    return notification
