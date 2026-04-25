from collections import defaultdict
from datetime import datetime, timezone

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import ReviewTargetType, UserRole
from app.models.review import Review
from app.models.user import User

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _serialize_review(review: Review) -> dict[str, object]:
    return {
        "id": str(review.id),
        "clinic_id": str(review.clinic_id),
        "doctor_id": str(review.doctor_id) if review.doctor_id else None,
        "patient_user_id": str(review.patient_user_id) if review.patient_user_id else None,
        "token_id": str(review.token_id) if review.token_id else None,
        "target_type": review.target_type,
        "rating": review.rating,
        "comment": review.comment,
        "patient_name": review.patient_name,
        "created_at": review.created_at,
    }


def _avg_ratings(reviews: list[Review]) -> float:
    if not reviews:
        return 0.0
    return round(sum(review.rating for review in reviews) / len(reviews), 2)


async def _refresh_clinic_rating(clinic_id: PydanticObjectId) -> None:
    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        return

    clinic_reviews = await Review.find(
        Review.clinic_id == clinic_id,
        Review.target_type == ReviewTargetType.CLINIC,
    ).to_list()

    clinic.rating = _avg_ratings(clinic_reviews)
    clinic.updated_at = datetime.now(timezone.utc)
    await clinic.save()


class AddReviewRequest(BaseModel):
    clinic_id: str
    target_type: ReviewTargetType = ReviewTargetType.CLINIC
    doctor_id: str | None = None
    patient_user_id: str | None = None
    token_id: str | None = None
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1200)
    patient_name: str | None = Field(default=None, max_length=120)


class ReviewResponse(BaseModel):
    id: str
    clinic_id: str
    doctor_id: str | None = None
    patient_user_id: str | None = None
    token_id: str | None = None
    target_type: ReviewTargetType
    rating: int
    comment: str
    patient_name: str | None = None
    created_at: datetime


class DoctorRatingSummary(BaseModel):
    doctor_id: str
    doctor_name: str
    average_rating: float
    total_reviews: int


class ClinicReviewSummaryResponse(BaseModel):
    clinic_id: str
    clinic_average_rating: float
    total_clinic_reviews: int
    total_doctor_reviews: int
    doctor_summaries: list[DoctorRatingSummary]


@router.post(
    "",
    response_model=ReviewResponse,
    summary="Create a review",
    description="Create a star review for a clinic or doctor.",
    status_code=status.HTTP_201_CREATED,
)
async def create_review(payload: AddReviewRequest) -> ReviewResponse:
    clinic_id = _parse_object_id(payload.clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    doctor_id: PydanticObjectId | None = None
    if payload.target_type == ReviewTargetType.DOCTOR:
        if payload.doctor_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="doctor_id is required for doctor reviews",
            )
        doctor_id = _parse_object_id(payload.doctor_id, "doctor_id")
        doctor = await Doctor.get(doctor_id)
        if doctor is None or doctor.clinic_id != clinic_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    patient_user_id: PydanticObjectId | None = None
    patient_name = payload.patient_name.strip() if payload.patient_name else None
    if payload.patient_user_id:
        patient_user_id = _parse_object_id(payload.patient_user_id, "patient_user_id")
        patient = await User.get(patient_user_id)
        if patient is None or patient.role != UserRole.PATIENT:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        if patient_name is None:
            patient_name = patient.name

    token_id = _parse_object_id(payload.token_id, "token_id") if payload.token_id else None

    review = Review(
        clinic_id=clinic_id,
        doctor_id=doctor_id,
        patient_user_id=patient_user_id,
        token_id=token_id,
        target_type=payload.target_type,
        rating=payload.rating,
        comment=payload.comment.strip(),
        patient_name=patient_name,
    )
    await review.insert()

    await _refresh_clinic_rating(clinic_id)
    return ReviewResponse(**_serialize_review(review))


@router.get(
    "/clinic/{clinic_id}",
    response_model=list[ReviewResponse],
    summary="List clinic reviews",
)
async def list_clinic_reviews(
    clinic_id: str = Path(..., description="Clinic id"),
) -> list[ReviewResponse]:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")

    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    reviews = await Review.find(
        Review.clinic_id == clinic_object_id,
        Review.target_type == ReviewTargetType.CLINIC,
    ).sort("-created_at").to_list()

    return [ReviewResponse(**_serialize_review(review)) for review in reviews]


@router.get(
    "/doctor/{doctor_id}",
    response_model=list[ReviewResponse],
    summary="List doctor reviews",
)
async def list_doctor_reviews(
    doctor_id: str = Path(..., description="Doctor id"),
) -> list[ReviewResponse]:
    doctor_object_id = _parse_object_id(doctor_id, "doctor_id")
    doctor = await Doctor.get(doctor_object_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    reviews = await Review.find(
        Review.doctor_id == doctor_object_id,
        Review.target_type == ReviewTargetType.DOCTOR,
    ).sort("-created_at").to_list()

    return [ReviewResponse(**_serialize_review(review)) for review in reviews]


@router.get(
    "/patient/{patient_user_id}",
    response_model=list[ReviewResponse],
    summary="List patient-authored reviews",
)
async def list_patient_reviews(
    patient_user_id: str = Path(..., description="Patient user id"),
) -> list[ReviewResponse]:
    patient_id = _parse_object_id(patient_user_id, "patient_user_id")
    patient = await User.get(patient_id)
    if patient is None or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    reviews = await Review.find(Review.patient_user_id == patient_id).sort("-created_at").to_list()
    return [ReviewResponse(**_serialize_review(review)) for review in reviews]


@router.get(
    "/clinic/{clinic_id}/summary",
    response_model=ClinicReviewSummaryResponse,
    summary="Get clinic review summary",
)
async def get_clinic_review_summary(
    clinic_id: str = Path(..., description="Clinic id"),
) -> ClinicReviewSummaryResponse:
    clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
    clinic = await Clinic.get(clinic_object_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    clinic_reviews = await Review.find(
        Review.clinic_id == clinic_object_id,
        Review.target_type == ReviewTargetType.CLINIC,
    ).to_list()
    doctor_reviews = await Review.find(
        Review.clinic_id == clinic_object_id,
        Review.target_type == ReviewTargetType.DOCTOR,
    ).to_list()

    doctor_rating_groups: dict[PydanticObjectId, list[Review]] = defaultdict(list)
    for review in doctor_reviews:
        if review.doctor_id is not None:
            doctor_rating_groups[review.doctor_id].append(review)

    doctors = await Doctor.find(Doctor.clinic_id == clinic_object_id).to_list()
    doctor_name_map = {doctor.id: doctor.name for doctor in doctors}

    doctor_summaries: list[DoctorRatingSummary] = []
    for doctor_id, reviews in doctor_rating_groups.items():
        doctor_summaries.append(
            DoctorRatingSummary(
                doctor_id=str(doctor_id),
                doctor_name=doctor_name_map.get(doctor_id, "Doctor"),
                average_rating=_avg_ratings(reviews),
                total_reviews=len(reviews),
            )
        )

    doctor_summaries.sort(key=lambda summary: summary.average_rating, reverse=True)

    return ClinicReviewSummaryResponse(
        clinic_id=str(clinic_object_id),
        clinic_average_rating=_avg_ratings(clinic_reviews),
        total_clinic_reviews=len(clinic_reviews),
        total_doctor_reviews=len(doctor_reviews),
        doctor_summaries=doctor_summaries,
    )


@router.get(
    "/{clinic_id}",
    response_model=list[ReviewResponse],
    summary="List clinic reviews (legacy route)",
)
async def list_clinic_reviews_legacy(
    clinic_id: str = Path(..., description="Clinic id"),
) -> list[ReviewResponse]:
    return await list_clinic_reviews(clinic_id)
