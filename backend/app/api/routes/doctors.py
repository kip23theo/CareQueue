from datetime import datetime, timezone
from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import QueueStatus, UserRole
from app.models.medical_document import MedicalDocument
from app.models.medical_history import MedicalHistory
from app.models.queue_token import QueueToken
from app.models.user import User
from app.services.notification_service import create_notification
from app.services.queue_service import recalculate_waiting_positions

router = APIRouter(prefix="/doctors", tags=["doctors"])


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


async def _resolve_doctor(doctor_or_user_id: str) -> Doctor:
    object_id = _parse_object_id(doctor_or_user_id, "doctor_id")
    doctor = await Doctor.get(object_id)
    if doctor is None:
        doctor = await Doctor.find_one(Doctor.user_id == object_id)

    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found",
        )
    return doctor


def _serialize_queue_token(token: QueueToken) -> dict[str, Any]:
    return {
        "id": str(token.id),
        "clinic_id": str(token.clinic_id),
        "doctor_id": str(token.doctor_id) if token.doctor_id else None,
        "patient_user_id": str(token.patient_user_id) if token.patient_user_id else None,
        "token_number": token.token_number,
        "token_display": f"A{token.token_number:02d}",
        "patient_name": token.patient_name,
        "patient_phone": token.patient_phone,
        "patient_age": token.patient_age,
        "symptoms": token.symptoms or None,
        "status": token.status,
        "position": token.position,
        "est_wait_mins": token.est_wait_mins,
        "joined_at": token.joined_at,
        "called_at": token.called_at,
        "consult_start": token.consult_start,
        "consult_end": token.consult_end,
        "date": token.date,
        "payment_amount": token.payment_amount,
        "payment_method": token.payment_method,
        "payment_notes": token.payment_notes or None,
        "payment_recorded_at": token.payment_recorded_at,
        "payment_recorded_by_role": token.payment_recorded_by_role,
        "payment_recorded_by_name": token.payment_recorded_by_name,
        "is_walkin": False,
    }


def _serialize_medical_history(entry: MedicalHistory) -> dict[str, Any]:
    return {
        "id": str(entry.id),
        "patient_user_id": str(entry.patient_user_id),
        "clinic_id": str(entry.clinic_id) if entry.clinic_id else None,
        "doctor_id": str(entry.doctor_id) if entry.doctor_id else None,
        "title": entry.title,
        "diagnosis": entry.diagnosis,
        "notes": entry.notes,
        "prescriptions": entry.prescriptions,
        "vitals": entry.vitals,
        "visit_date": entry.visit_date,
        "follow_up_date": entry.follow_up_date,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
    }


def _serialize_medical_document(document: MedicalDocument) -> dict[str, Any]:
    return {
        "id": str(document.id),
        "patient_user_id": str(document.patient_user_id),
        "clinic_id": str(document.clinic_id) if document.clinic_id else None,
        "medical_history_id": str(document.medical_history_id) if document.medical_history_id else None,
        "uploaded_by_user_id": str(document.uploaded_by_user_id) if document.uploaded_by_user_id else None,
        "title": document.title,
        "document_type": document.document_type,
        "file_url": document.file_url,
        "description": document.description,
        "tags": document.tags,
        "issued_on": document.issued_on,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
    }


def _serialize_patient(patient: User) -> dict[str, Any]:
    return {
        "id": str(patient.id),
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "role": patient.role,
    }


class UpdateAvailabilityRequest(BaseModel):
    is_available: bool = Field(examples=[True])


class UpdateDelayRequest(BaseModel):
    delay_mins: int = Field(examples=[5], ge=0, le=240)


class MessageResponse(BaseModel):
    message: str


@router.get(
    "/{doctor_id}/queue",
    summary="Get doctor queue",
    description="Returns current token and next five waiting tokens for a doctor.",
    responses={
        200: {"description": "Doctor queue returned successfully"},
        400: {"description": "Invalid doctor_id format"},
        404: {"description": "Doctor not found"},
    },
)
async def get_doctor_queue(
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
) -> dict[str, Any]:
    doctor = await _resolve_doctor(doctor_id)
    today = datetime.now(timezone.utc).date().isoformat()

    tokens = await QueueToken.find(
        QueueToken.doctor_id == doctor.id,
        QueueToken.date == today,
    ).sort("+position").to_list()

    current = next(
        (token for token in tokens if token.status == QueueStatus.IN_CONSULTATION),
        None,
    )
    if current is None:
        current = next((token for token in tokens if token.status == QueueStatus.CALLED), None)

    waiting = [token for token in tokens if token.status == QueueStatus.WAITING]
    completed = [token for token in tokens if token.status == QueueStatus.COMPLETED]

    return {
        "doctor_id": str(doctor.id),
        "current": _serialize_queue_token(current) if current else None,
        "next_five": [_serialize_queue_token(token) for token in waiting[:5]],
        "waiting_count": len(waiting),
        "completed_today": len(completed),
        "completed_tokens": [_serialize_queue_token(token) for token in completed],
    }


@router.get(
    "/{doctor_id}/consulted-patients",
    summary="Get consulted patients with history and documents",
    description=(
        "Returns recently completed consultations for a doctor together with matched "
        "patient profile, full medical history, and documents."
    ),
)
async def get_consulted_patients(
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
    limit: int = Query(default=50, ge=1, le=250),
) -> dict[str, Any]:
    doctor = await _resolve_doctor(doctor_id)

    tokens = await QueueToken.find(
        QueueToken.doctor_id == doctor.id,
        QueueToken.status == QueueStatus.COMPLETED,
    ).sort("-consult_end").limit(limit).to_list()

    token_patient_map: dict[str, str] = {}
    match_source: dict[str, str] = {}

    linked_patient_ids = {
        token.patient_user_id
        for token in tokens
        if token.patient_user_id is not None
    }

    linked_patients = await User.find(
        {"_id": {"$in": list(linked_patient_ids)}, "role": UserRole.PATIENT}
    ).to_list() if linked_patient_ids else []
    patient_by_id = {str(patient.id): patient for patient in linked_patients}

    phones = sorted({
        token.patient_phone.strip()
        for token in tokens
        if token.patient_phone.strip()
    })
    phone_matches = await User.find(
        {"phone": {"$in": phones}, "role": UserRole.PATIENT}
    ).to_list() if phones else []
    patient_by_phone = {
        (patient.phone or "").strip(): patient
        for patient in phone_matches
        if patient.phone
    }

    for token in tokens:
        token_key = str(token.id)
        if token.patient_user_id is not None:
            candidate = patient_by_id.get(str(token.patient_user_id))
            if candidate is not None:
                token_patient_map[token_key] = str(candidate.id)
                match_source[token_key] = "linked_token"
                continue

        phone_key = token.patient_phone.strip()
        if phone_key:
            candidate = patient_by_phone.get(phone_key)
            if candidate is not None:
                token_patient_map[token_key] = str(candidate.id)
                match_source[token_key] = "phone_match"
                continue

        match_source[token_key] = "not_found"

    patient_ids = [PydanticObjectId(patient_id) for patient_id in set(token_patient_map.values())]

    history_entries = await MedicalHistory.find(
        {"patient_user_id": {"$in": patient_ids}}
    ).sort("-visit_date").to_list() if patient_ids else []
    documents = await MedicalDocument.find(
        {"patient_user_id": {"$in": patient_ids}}
    ).sort("-created_at").to_list() if patient_ids else []

    history_by_patient: dict[str, list[dict[str, Any]]] = {}
    for entry in history_entries:
        key = str(entry.patient_user_id)
        history_by_patient.setdefault(key, []).append(_serialize_medical_history(entry))

    documents_by_patient: dict[str, list[dict[str, Any]]] = {}
    for document in documents:
        key = str(document.patient_user_id)
        documents_by_patient.setdefault(key, []).append(_serialize_medical_document(document))

    records: list[dict[str, Any]] = []
    for token in tokens:
        token_key = str(token.id)
        patient_id = token_patient_map.get(token_key)
        patient = patient_by_id.get(patient_id) if patient_id else None
        if patient is None and patient_id:
            phone_key = token.patient_phone.strip()
            patient = patient_by_phone.get(phone_key) if phone_key else None

        records.append(
            {
                "token": _serialize_queue_token(token),
                "patient": _serialize_patient(patient) if patient else None,
                "patient_lookup": match_source[token_key],
                "medical_history": history_by_patient.get(patient_id or "", []),
                "documents": documents_by_patient.get(patient_id or "", []),
            }
        )

    return {
        "doctor_id": str(doctor.id),
        "consulted_patients": records,
    }


@router.patch(
    "/{doctor_id}/availability",
    response_model=MessageResponse,
    summary="Update doctor availability",
    description="Updates whether the doctor is currently available.",
)
async def update_doctor_availability(
    payload: UpdateAvailabilityRequest,
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
) -> MessageResponse:
    doctor = await _resolve_doctor(doctor_id)
    doctor.is_available = payload.is_available
    await doctor.save()
    return MessageResponse(message="Availability updated")


@router.patch(
    "/{doctor_id}/delay",
    response_model=MessageResponse,
    summary="Update doctor delay",
    description="Updates additional delay minutes for wait time calculations.",
)
async def update_doctor_delay(
    payload: UpdateDelayRequest,
    doctor_id: str = Path(..., description="Doctor id or linked user id"),
) -> MessageResponse:
    doctor = await _resolve_doctor(doctor_id)
    previous_delay = doctor.delay_mins
    doctor.delay_mins = payload.delay_mins
    await doctor.save()

    today = datetime.now(timezone.utc).date().isoformat()
    updated_waiting_tokens = await recalculate_waiting_positions(doctor.clinic_id, today)

    notifications_sent = 0
    if payload.delay_mins > previous_delay:
        clinic = await Clinic.get(doctor.clinic_id)
        clinic_name = clinic.name if clinic else "the clinic"
        impacted = [
            token for token in updated_waiting_tokens
            if token.doctor_id == doctor.id
        ][:5]
        for token in impacted:
            notification = await create_notification(
                token=token,
                message=(
                    f"{doctor.name} is running about {payload.delay_mins} minutes late at {clinic_name}. "
                    f"Your updated estimated wait is {token.est_wait_mins} minutes."
                ),
            )
            if notification is not None:
                notifications_sent += 1

    return MessageResponse(
        message=f"Delay updated and queue recalculated. Notifications sent: {notifications_sent}"
    )
