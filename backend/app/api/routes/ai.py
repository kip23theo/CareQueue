import math
from datetime import datetime, timezone
from typing import Any

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.enums import ClinicVerificationStatus, NotificationChannel, QueueStatus
from app.models.queue_token import QueueToken
from app.services.ai_service import (
    ai_chat,
    ai_generate_wait_notifications,
    ai_parse_patient,
    ai_predict_wait,
    ai_recommend_clinics,
)
from app.services.notification_service import create_notification
from app.services.queue_service import recalculate_waiting_positions

router = APIRouter(prefix="/ai", tags=["AI"])

EARTH_RADIUS_KM = 6371.0


def _parse_object_id(value: str, field_name: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        ) from exc


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        (math.sin(dlat / 2) ** 2)
        + math.cos(lat1_rad) * math.cos(lat2_rad) * (math.sin(dlng / 2) ** 2)
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def _clinic_coords(clinic: Clinic) -> tuple[float, float] | None:
    coordinates = clinic.location.get("coordinates", [])
    if len(coordinates) != 2:
        return None
    clinic_lng, clinic_lat = coordinates
    return float(clinic_lat), float(clinic_lng)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = Field(default_factory=list)
    clinic_context: dict[str, Any] | None = None


class ChatResponse(BaseModel):
    reply: str
    suggested_clinic_id: str | None = None


class ParsePatientRequest(BaseModel):
    text: str


class ParsePatientResponse(BaseModel):
    name: str
    age: int | None = None
    symptoms: str
    gender: str | None = None
    confidence: float = Field(default=0.0, ge=0, le=1)


class RecommendRequest(BaseModel):
    lat: float
    lng: float
    symptoms: str
    nearby_clinics: list[dict[str, Any]] = Field(default_factory=list)
    radius_m: int = Field(default=5000, ge=500, le=50000)
    top_k: int = Field(default=3, ge=1, le=5)


class RecommendClinic(BaseModel):
    clinic_id: str
    clinic_name: str
    rank: int
    reason: str
    score: float
    distance_km: float
    est_wait_mins: int
    rating: float


class RecommendResponse(BaseModel):
    recommendations: list[RecommendClinic]
    summary: str = ""


class PredictWaitTokenUpdate(BaseModel):
    token_id: str
    token_number: int
    position: int
    old_est_wait_mins: int
    new_est_wait_mins: int


class PredictWaitResponse(BaseModel):
    clinic_id: str
    updated_tokens: int
    notifications_generated: int = 0
    tokens: list[PredictWaitTokenUpdate] = Field(default_factory=list)


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    try:
        history_text = "\n".join(f"{m.role}: {m.content}" for m in req.history[-6:])
        full_message = f"{history_text}\nuser: {req.message}" if history_text else req.message
        reply = await ai_chat(full_message, clinic_context=req.clinic_context)
        return ChatResponse(reply=reply)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/parse-patient", response_model=ParsePatientResponse)
async def parse_patient(req: ParsePatientRequest) -> ParsePatientResponse:
    try:
        result = await ai_parse_patient(req.text)
        return ParsePatientResponse(
            name=str(result.get("name", "")).strip(),
            age=result.get("age"),
            symptoms=str(result.get("symptoms", "")).strip(),
            gender=result.get("gender"),
            confidence=float(result.get("confidence", 0.0)),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest) -> RecommendResponse:
    try:
        today = datetime.now(timezone.utc).date().isoformat()

        nearby: list[dict[str, Any]] = []
        if req.nearby_clinics:
            for row in req.nearby_clinics:
                if not isinstance(row, dict):
                    continue
                clinic_id = str(row.get("clinic_id") or row.get("id") or "").strip()
                if not clinic_id:
                    continue
                nearby.append(
                    {
                        "id": clinic_id,
                        "name": str(row.get("name", "Clinic")).strip() or "Clinic",
                        "specializations": row.get("specializations", []),
                        "queue_length": int(row.get("queue_length", 0) or 0),
                        "est_wait_mins": int(row.get("est_wait_mins", 0) or 0),
                        "distance_km": float(row.get("distance_km", 0.0) or 0.0),
                        "rating": float(row.get("rating", 0.0) or 0.0),
                    }
                )
        else:
            clinics = await Clinic.find(
                Clinic.verification_status == ClinicVerificationStatus.APPROVED,
                Clinic.is_open == True,  # noqa: E712
            ).to_list()

            waiting_tokens = await QueueToken.find(
                QueueToken.date == today,
                QueueToken.status == QueueStatus.WAITING,
            ).to_list()

            waiting_count_map: dict[str, int] = {}
            for token in waiting_tokens:
                key = str(token.clinic_id)
                waiting_count_map[key] = waiting_count_map.get(key, 0) + 1

            radius_km = req.radius_m / 1000.0
            for clinic in clinics:
                coords = _clinic_coords(clinic)
                if coords is None:
                    continue
                clinic_lat, clinic_lng = coords
                distance_km = _haversine_km(req.lat, req.lng, clinic_lat, clinic_lng)
                if distance_km > radius_km:
                    continue
                waiting_count = waiting_count_map.get(str(clinic.id), 0)
                nearby.append(
                    {
                        "id": str(clinic.id),
                        "name": clinic.name,
                        "specializations": clinic.specializations,
                        "queue_length": waiting_count,
                        "est_wait_mins": (waiting_count * clinic.avg_consult_time) + clinic.delay_buffer,
                        "distance_km": round(distance_km, 2),
                        "rating": clinic.rating,
                    }
                )

        if not nearby:
            return RecommendResponse(recommendations=[], summary="No nearby clinics found.")

        raw_recommendations = await ai_recommend_clinics(req.symptoms, nearby)
        nearby_by_id = {str(row.get("id")): row for row in nearby}

        normalized: list[RecommendClinic] = []
        for idx, item in enumerate(raw_recommendations, start=1):
            clinic_id = str(item.get("clinic_id", "")).strip()
            if not clinic_id:
                continue
            clinic_row = nearby_by_id.get(clinic_id)
            if clinic_row is None:
                continue
            normalized.append(
                RecommendClinic(
                    clinic_id=clinic_id,
                    clinic_name=str(clinic_row.get("name", "Clinic")),
                    rank=max(1, int(item.get("rank", idx) or idx)),
                    reason=str(item.get("reason", "Good overall match")).strip() or "Good overall match",
                    score=max(0.0, min(100.0, float(item.get("score", 0.0) or 0.0))),
                    distance_km=float(clinic_row.get("distance_km", 0.0) or 0.0),
                    est_wait_mins=int(clinic_row.get("est_wait_mins", 0) or 0),
                    rating=float(clinic_row.get("rating", 0.0) or 0.0),
                )
            )

        if not normalized:
            ranked_fallback = sorted(
                nearby,
                key=lambda row: (float(row.get("distance_km", 100.0)), int(row.get("est_wait_mins", 9999))),
            )[:req.top_k]
            normalized = [
                RecommendClinic(
                    clinic_id=str(row["id"]),
                    clinic_name=str(row.get("name", "Clinic")),
                    rank=index + 1,
                    reason="Closest option with a manageable wait.",
                    score=max(0.0, min(100.0, 70.0 - (index * 8.0))),
                    distance_km=float(row.get("distance_km", 0.0) or 0.0),
                    est_wait_mins=int(row.get("est_wait_mins", 0) or 0),
                    rating=float(row.get("rating", 0.0) or 0.0),
                )
                for index, row in enumerate(ranked_fallback)
            ]

        normalized.sort(key=lambda row: (row.rank, -row.score))
        clipped = normalized[:req.top_k]

        top = clipped[0]
        summary = (
            f"Top recommendation: {top.clinic_name} "
            f"({top.distance_km:.1f} km, ~{top.est_wait_mins} min wait)."
        )
        return RecommendResponse(recommendations=clipped, summary=summary)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/predict-wait/{clinic_id}", response_model=PredictWaitResponse)
async def predict_wait(
    clinic_id: str = Path(..., description="Clinic id"),
) -> PredictWaitResponse:
    try:
        clinic_object_id = _parse_object_id(clinic_id, "clinic_id")
        clinic = await Clinic.get(clinic_object_id)
        if clinic is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

        today = datetime.now(timezone.utc).date().isoformat()
        waiting_tokens = await recalculate_waiting_positions(clinic_object_id, today)
        if not waiting_tokens:
            return PredictWaitResponse(
                clinic_id=str(clinic_object_id),
                updated_tokens=0,
                notifications_generated=0,
                tokens=[],
            )

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
        doctor_delay_avg = (
            int(round(sum(doctor.delay_mins for doctor in doctors) / len(doctors)))
            if doctors
            else 0
        )

        ai_input = [
            {
                "token_id": str(token.id),
                "position": token.position,
                "symptoms": token.symptoms or "",
                "status": token.status.value if hasattr(token.status, "value") else str(token.status),
            }
            for token in waiting_tokens
        ]
        predicted = await ai_predict_wait(
            queue_tokens=ai_input,
            doctor_avg_consult_mins=clinic.avg_consult_time,
            doctor_delay_mins=doctor_delay_avg,
            clinic_delay_buffer=clinic.delay_buffer,
        )

        predicted_map = {
            str(row.get("token_id")): max(0, int(row.get("est_wait_mins", 0) or 0))
            for row in predicted
            if isinstance(row, dict)
        }

        updates: list[PredictWaitTokenUpdate] = []
        token_by_id = {str(token.id): token for token in waiting_tokens}
        previous_wait = 0
        now = datetime.now(timezone.utc)

        for token in waiting_tokens:
            token_id = str(token.id)
            old_wait = int(token.est_wait_mins)
            new_wait = predicted_map.get(token_id, old_wait)
            new_wait = max(new_wait, previous_wait)
            previous_wait = new_wait

            if new_wait == old_wait:
                continue

            token.est_wait_mins = new_wait
            token.updated_at = now
            await token.save()

            updates.append(
                PredictWaitTokenUpdate(
                    token_id=token_id,
                    token_number=token.token_number,
                    position=token.position,
                    old_est_wait_mins=old_wait,
                    new_est_wait_mins=new_wait,
                )
            )

        notifiable = [
            update for update in updates
            if abs(update.new_est_wait_mins - update.old_est_wait_mins) >= 5 or update.position <= 2
        ]
        ai_messages = await ai_generate_wait_notifications(
            clinic_name=clinic.name,
            updates=[
                {
                    "token_id": item.token_id,
                    "token_display": f"A{item.token_number:02d}",
                    "token_number": item.token_number,
                    "new_est_wait_mins": item.new_est_wait_mins,
                    "position": item.position,
                }
                for item in notifiable
            ],
        )

        notifications_generated = 0
        for item in notifiable:
            token = token_by_id.get(item.token_id)
            if token is None:
                continue
            message = ai_messages.get(item.token_id)
            if not message:
                message = (
                    f"Token A{item.token_number:02d} wait updated at {clinic.name}. "
                    f"New estimate is about {item.new_est_wait_mins} minutes."
                )
            notification = await create_notification(
                token=token,
                channel=NotificationChannel.PUSH,
                message=message,
            )
            if notification is not None:
                notifications_generated += 1

        return PredictWaitResponse(
            clinic_id=str(clinic_object_id),
            updated_tokens=len(updates),
            notifications_generated=notifications_generated,
            tokens=updates,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
