from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import QueueStatus
from app.models.queue_token import QueueToken


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def compute_wait_minutes(
    *,
    position: int,
    clinic: Clinic,
    doctor: Doctor | None,
) -> int:
    consult_mins = doctor.avg_consult_mins if doctor and doctor.avg_consult_mins > 0 else clinic.avg_consult_time
    delay_mins = doctor.delay_mins if doctor else 0
    return max(0, (position * consult_mins) + delay_mins + clinic.delay_buffer)


async def recalculate_waiting_positions(
    clinic_id: PydanticObjectId,
    queue_date: str,
) -> list[QueueToken]:
    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        return []

    waiting_tokens = await QueueToken.find(
        QueueToken.clinic_id == clinic_id,
        QueueToken.date == queue_date,
        QueueToken.status == QueueStatus.WAITING,
    ).sort("+joined_at").to_list()

    doctor_ids = sorted({
        token.doctor_id
        for token in waiting_tokens
        if token.doctor_id is not None
    })
    doctors = (
        await Doctor.find({"_id": {"$in": doctor_ids}}).to_list()
        if doctor_ids
        else []
    )
    doctor_by_id = {str(doctor.id): doctor for doctor in doctors}

    now = utc_now()
    for idx, token in enumerate(waiting_tokens, start=1):
        doctor = doctor_by_id.get(str(token.doctor_id)) if token.doctor_id else None
        expected_wait = compute_wait_minutes(position=idx, clinic=clinic, doctor=doctor)
        if token.position != idx or token.est_wait_mins != expected_wait:
            token.position = idx
            token.est_wait_mins = expected_wait
            token.updated_at = now
            await token.save()

    return waiting_tokens
