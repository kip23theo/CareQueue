from datetime import datetime, timezone

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.models.enums import MedicalDocumentType, UserRole
from app.models.medical_document import MedicalDocument
from app.models.medical_history import MedicalHistory
from app.models.user import User

router = APIRouter(prefix="/patients", tags=["patients"])


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _serialize_history(entry: MedicalHistory) -> dict[str, object]:
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


def _serialize_document(document: MedicalDocument) -> dict[str, object]:
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


async def _ensure_patient(patient_user_id: PydanticObjectId) -> User:
    patient = await User.get(patient_user_id)
    if patient is None or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


class PatientProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    role: UserRole


class MedicalHistoryResponse(BaseModel):
    id: str
    patient_user_id: str
    clinic_id: str | None = None
    doctor_id: str | None = None
    title: str
    diagnosis: str
    notes: str
    prescriptions: list[str]
    vitals: dict[str, str]
    visit_date: datetime
    follow_up_date: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MedicalDocumentResponse(BaseModel):
    id: str
    patient_user_id: str
    clinic_id: str | None = None
    medical_history_id: str | None = None
    uploaded_by_user_id: str | None = None
    title: str
    document_type: MedicalDocumentType
    file_url: str
    description: str
    tags: list[str]
    issued_on: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PatientDashboardResponse(BaseModel):
    patient: PatientProfileResponse
    medical_history: list[MedicalHistoryResponse]
    documents: list[MedicalDocumentResponse]


class CreateMedicalHistoryRequest(BaseModel):
    clinic_id: str | None = None
    doctor_id: str | None = None
    title: str = Field(min_length=2, max_length=180)
    diagnosis: str = Field(default="", max_length=500)
    notes: str = Field(default="", max_length=4000)
    prescriptions: list[str] = Field(default_factory=list)
    vitals: dict[str, str] = Field(default_factory=dict)
    visit_date: datetime | None = None
    follow_up_date: datetime | None = None


class CreateMedicalDocumentRequest(BaseModel):
    clinic_id: str | None = None
    medical_history_id: str | None = None
    uploaded_by_user_id: str | None = None
    title: str = Field(min_length=2, max_length=180)
    document_type: MedicalDocumentType = MedicalDocumentType.OTHER
    file_url: str = Field(min_length=6, max_length=1200)
    description: str = Field(default="", max_length=1200)
    tags: list[str] = Field(default_factory=list)
    issued_on: datetime | None = None


@router.get(
    "/{patient_user_id}/dashboard",
    response_model=PatientDashboardResponse,
    summary="Get patient dashboard",
    description="Returns patient profile, medical history timeline, and medical documents.",
)
async def get_patient_dashboard(
    patient_user_id: str = Path(..., description="Patient user id"),
) -> PatientDashboardResponse:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    patient = await _ensure_patient(patient_id)

    history = await MedicalHistory.find(
        MedicalHistory.patient_user_id == patient_id,
    ).sort("-visit_date").to_list()

    documents = await MedicalDocument.find(
        MedicalDocument.patient_user_id == patient_id,
    ).sort("-created_at").to_list()

    return PatientDashboardResponse(
        patient=PatientProfileResponse(
            id=str(patient.id),
            name=patient.name,
            email=patient.email,
            phone=patient.phone,
            role=patient.role,
        ),
        medical_history=[MedicalHistoryResponse(**_serialize_history(entry)) for entry in history],
        documents=[MedicalDocumentResponse(**_serialize_document(document)) for document in documents],
    )


@router.get(
    "/{patient_user_id}/medical-history",
    response_model=list[MedicalHistoryResponse],
    summary="List medical history",
)
async def list_medical_history(
    patient_user_id: str = Path(..., description="Patient user id"),
) -> list[MedicalHistoryResponse]:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    await _ensure_patient(patient_id)

    history = await MedicalHistory.find(
        MedicalHistory.patient_user_id == patient_id,
    ).sort("-visit_date").to_list()

    return [MedicalHistoryResponse(**_serialize_history(entry)) for entry in history]


@router.post(
    "/{patient_user_id}/medical-history",
    response_model=MedicalHistoryResponse,
    summary="Create medical history entry",
    status_code=status.HTTP_201_CREATED,
)
async def create_medical_history(
    payload: CreateMedicalHistoryRequest,
    patient_user_id: str = Path(..., description="Patient user id"),
) -> MedicalHistoryResponse:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    await _ensure_patient(patient_id)

    clinic_id = _parse_object_id(payload.clinic_id, "clinic_id") if payload.clinic_id else None
    doctor_id = _parse_object_id(payload.doctor_id, "doctor_id") if payload.doctor_id else None

    entry = MedicalHistory(
        patient_user_id=patient_id,
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        title=payload.title.strip(),
        diagnosis=payload.diagnosis.strip(),
        notes=payload.notes.strip(),
        prescriptions=[item.strip() for item in payload.prescriptions if item.strip()],
        vitals={key.strip(): value.strip() for key, value in payload.vitals.items() if key.strip() and value.strip()},
        visit_date=payload.visit_date or datetime.now(timezone.utc),
        follow_up_date=payload.follow_up_date,
    )
    await entry.insert()

    return MedicalHistoryResponse(**_serialize_history(entry))


@router.get(
    "/{patient_user_id}/documents",
    response_model=list[MedicalDocumentResponse],
    summary="List medical documents",
)
async def list_medical_documents(
    patient_user_id: str = Path(..., description="Patient user id"),
) -> list[MedicalDocumentResponse]:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    await _ensure_patient(patient_id)

    documents = await MedicalDocument.find(
        MedicalDocument.patient_user_id == patient_id,
    ).sort("-created_at").to_list()

    return [MedicalDocumentResponse(**_serialize_document(document)) for document in documents]


@router.post(
    "/{patient_user_id}/documents",
    response_model=MedicalDocumentResponse,
    summary="Add medical document metadata",
    status_code=status.HTTP_201_CREATED,
)
async def create_medical_document(
    payload: CreateMedicalDocumentRequest,
    patient_user_id: str = Path(..., description="Patient user id"),
) -> MedicalDocumentResponse:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    await _ensure_patient(patient_id)

    clinic_id = _parse_object_id(payload.clinic_id, "clinic_id") if payload.clinic_id else None
    medical_history_id = (
        _parse_object_id(payload.medical_history_id, "medical_history_id")
        if payload.medical_history_id
        else None
    )
    uploaded_by_user_id = (
        _parse_object_id(payload.uploaded_by_user_id, "uploaded_by_user_id")
        if payload.uploaded_by_user_id
        else None
    )

    document = MedicalDocument(
        patient_user_id=patient_id,
        clinic_id=clinic_id,
        medical_history_id=medical_history_id,
        uploaded_by_user_id=uploaded_by_user_id,
        title=payload.title.strip(),
        document_type=payload.document_type,
        file_url=payload.file_url.strip(),
        description=payload.description.strip(),
        tags=[tag.strip() for tag in payload.tags if tag.strip()],
        issued_on=payload.issued_on,
    )
    await document.insert()

    return MedicalDocumentResponse(**_serialize_document(document))
