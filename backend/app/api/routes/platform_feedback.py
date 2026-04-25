from datetime import datetime

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
from app.models.enums import UserRole
from app.models.platform_feedback import PlatformFeedback
from app.models.user import User

router = APIRouter(prefix="/platform-feedback", tags=["platform-feedback"])

ALLOWED_FEEDBACK_ROLES = {UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT}


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _serialize_feedback(item: PlatformFeedback) -> dict[str, object]:
    return {
        "id": str(item.id),
        "user_id": str(item.user_id),
        "user_name": item.user_name,
        "user_email": item.user_email,
        "user_role": item.user_role,
        "clinic_id": str(item.clinic_id) if item.clinic_id else None,
        "clinic_name": item.clinic_name,
        "rating": item.rating,
        "comment": item.comment,
        "created_at": item.created_at,
    }


class AddPlatformFeedbackRequest(BaseModel):
    user_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


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


@router.post(
    "",
    response_model=PlatformFeedbackResponse,
    summary="Submit platform feedback",
    description="Submit a star rating and optional comment about the CareQueue platform.",
    status_code=status.HTTP_201_CREATED,
)
async def create_platform_feedback(payload: AddPlatformFeedbackRequest) -> PlatformFeedbackResponse:
    user_id = _parse_object_id(payload.user_id, "user_id")
    user = await User.get(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role not in ALLOWED_FEEDBACK_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin, doctor, and patient users can submit platform feedback",
        )

    clinic_name: str | None = None
    if user.clinic_id:
        clinic = await Clinic.get(user.clinic_id)
        if clinic:
            clinic_name = clinic.name

    feedback = PlatformFeedback(
        user_id=user.id,
        user_role=user.role,
        user_name=user.name,
        user_email=user.email,
        clinic_id=user.clinic_id,
        clinic_name=clinic_name,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    await feedback.insert()

    return PlatformFeedbackResponse(**_serialize_feedback(feedback))
