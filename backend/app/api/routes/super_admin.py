from datetime import datetime, timezone
from typing import Any, Literal

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
from app.models.enums import ClinicVerificationStatus, UserRole
from app.models.platform_feedback import PlatformFeedback
from app.models.user import User

router = APIRouter(prefix="/super-admin", tags=["super-admin"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _clinic_lat_lng(clinic: Clinic) -> tuple[float | None, float | None]:
    coords = clinic.location.get("coordinates", [])
    if len(coords) != 2:
        return None, None
    lng, lat = coords
    return float(lat), float(lng)


class VerifyClinicRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reason: str | None = Field(default=None, max_length=500)
    verified_by_user_id: str | None = None


class PlatformFeedbackResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    user_role: UserRole
    clinic_id: str | None = None
    clinic_name: str | None = None
    rating: int
    comment: str
    created_at: datetime


@router.get(
    "/overview",
    summary="Get super admin overview",
)
async def get_overview() -> dict[str, Any]:
    total_clinics = await Clinic.find_all().count()
    pending_clinics = await Clinic.find(Clinic.verification_status == ClinicVerificationStatus.PENDING).count()
    approved_clinics = await Clinic.find(Clinic.verification_status == ClinicVerificationStatus.APPROVED).count()
    rejected_clinics = await Clinic.find(Clinic.verification_status == ClinicVerificationStatus.REJECTED).count()

    total_users = await User.find_all().count()
    super_admins = await User.find(User.role == UserRole.SUPER_ADMIN).count()
    admins = await User.find(User.role == UserRole.ADMIN).count()
    doctors = await User.find(User.role == UserRole.DOCTOR).count()
    receptionists = await User.find(User.role == UserRole.RECEPTIONIST).count()

    return {
        "clinics": {
            "total": total_clinics,
            "pending": pending_clinics,
            "approved": approved_clinics,
            "rejected": rejected_clinics,
        },
        "users": {
            "total": total_users,
            "super_admin": super_admins,
            "admin": admins,
            "doctor": doctors,
            "receptionist": receptionists,
        },
    }


@router.get(
    "/clinics",
    summary="List clinics",
)
async def list_clinics(
    verification_status: ClinicVerificationStatus | None = Query(default=None),
) -> list[dict[str, Any]]:
    query = Clinic.find_all()
    if verification_status is not None:
        query = Clinic.find(Clinic.verification_status == verification_status)

    clinics = await query.sort("-created_at").to_list()

    rows: list[dict[str, Any]] = []
    for clinic in clinics:
        clinic_admin = await User.find_one(
            User.clinic_id == clinic.id,
            User.role == UserRole.ADMIN,
        )
        user_count = await User.find(User.clinic_id == clinic.id).count()
        lat, lng = _clinic_lat_lng(clinic)

        rows.append(
            {
                "id": str(clinic.id),
                "name": clinic.name,
                "address": clinic.address,
                "phone": clinic.phone,
                "latitude": lat,
                "longitude": lng,
                "verification_status": clinic.verification_status,
                "verified_at": clinic.verified_at,
                "rejection_reason": clinic.rejection_reason,
                "created_at": clinic.created_at,
                "updated_at": clinic.updated_at,
                "admin": {
                    "id": str(clinic_admin.id),
                    "name": clinic_admin.name,
                    "email": clinic_admin.email,
                } if clinic_admin else None,
                "user_count": user_count,
            }
        )

    return rows


@router.patch(
    "/clinics/{clinic_id}/verification",
    summary="Verify clinic",
)
async def verify_clinic(
    payload: VerifyClinicRequest,
    clinic_id: str = Path(..., description="Clinic id"),
) -> dict[str, Any]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    if payload.status == "approved":
        clinic.verification_status = ClinicVerificationStatus.APPROVED
        clinic.is_open = True
        clinic.rejection_reason = None
    else:
        clinic.verification_status = ClinicVerificationStatus.REJECTED
        clinic.is_open = False
        clinic.rejection_reason = (payload.reason or "Rejected by super admin").strip()

    clinic.verified_at = _now()
    clinic.updated_at = _now()

    if payload.verified_by_user_id:
        clinic.verified_by = _parse_object_id(payload.verified_by_user_id, "verified_by_user_id")

    await clinic.save()

    return {
        "id": str(clinic.id),
        "verification_status": clinic.verification_status,
        "verified_at": clinic.verified_at,
        "rejection_reason": clinic.rejection_reason,
    }


@router.get(
    "/users",
    summary="List users",
)
async def list_users(
    clinic_id: str | None = Query(default=None),
    role: UserRole | None = Query(default=None),
) -> list[dict[str, Any]]:
    filters: list[Any] = []

    clinic_object_id: PydanticObjectId | None = None
    if clinic_id:
        clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
        filters.append(User.clinic_id == clinic_object_id)

    if role is not None:
        filters.append(User.role == role)

    query = User.find(*filters) if filters else User.find_all()
    users = await query.sort("-created_at").to_list()

    clinic_ids = [user.clinic_id for user in users if user.clinic_id is not None]
    unique_clinic_ids = list({value for value in clinic_ids})

    clinic_map: dict[PydanticObjectId, Clinic] = {}
    if unique_clinic_ids:
        clinics = await Clinic.find({"_id": {"$in": unique_clinic_ids}}).to_list()
        clinic_map = {clinic.id: clinic for clinic in clinics}

    return [
        {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "clinic_id": str(user.clinic_id) if user.clinic_id else None,
            "clinic_name": clinic_map[user.clinic_id].name if user.clinic_id in clinic_map else None,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }
        for user in users
    ]


@router.get(
    "/platform-feedback",
    response_model=list[PlatformFeedbackResponse],
    summary="List platform feedback",
)
async def list_platform_feedback(
    viewer_user_id: str = Query(..., description="Super admin user id"),
    role: UserRole | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[PlatformFeedbackResponse]:
    viewer_id = _parse_object_id(viewer_user_id, "viewer_user_id")
    viewer = await User.get(viewer_id)
    if viewer is None or viewer.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can access platform feedback",
        )

    filters: list[Any] = []
    if role is not None:
        if role not in {UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="role must be one of admin, doctor, patient",
            )
        filters.append(PlatformFeedback.user_role == role)

    query = PlatformFeedback.find(*filters) if filters else PlatformFeedback.find_all()
    feedback_items = await query.sort("-created_at").limit(limit).to_list()

    return [
        PlatformFeedbackResponse(
            id=str(item.id),
            user_id=str(item.user_id),
            user_name=item.user_name,
            user_email=item.user_email,
            user_role=item.user_role,
            clinic_id=str(item.clinic_id) if item.clinic_id else None,
            clinic_name=item.clinic_name,
            rating=item.rating,
            comment=item.comment,
            created_at=item.created_at,
        )
        for item in feedback_items
    ]
