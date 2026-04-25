"""
CareQueue AI Router
Drop this file into: backend/app/routers/ai.py

Then in your main app (app/main.py), add:
    from app.routers import ai
    app.include_router(ai.router)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import (
    ai_chat,
    ai_parse_patient,
    ai_recommend_clinics,
    ai_predict_wait,
)
# Replace these with your actual DB helpers:
# from app.db import clinics_collection, queue_tokens_collection, doctors_collection

router = APIRouter(prefix="/ai", tags=["AI"])


# ── Request / Response models ─────────────────────────────────────────────────

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    reply: str


class ParsePatientRequest(BaseModel):
    text: str

class ParsePatientResponse(BaseModel):
    name: str
    age: int | None
    symptoms: str


class RecommendRequest(BaseModel):
    lat: float
    lng: float
    symptoms: str

class RecommendResponse(BaseModel):
    recommendations: list[dict]


class PredictWaitResponse(BaseModel):
    clinic_id: str
    updated_tokens: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Patient AI assistant — symptom triage and clinic Q&A."""
    try:
        history_text = "\n".join(
            f"{m.role}: {m.content}" for m in req.history[-6:]
        )
        full_message = f"{history_text}\nuser: {req.message}" if history_text else req.message
        reply = await ai_chat(full_message)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-patient", response_model=ParsePatientResponse)
async def parse_patient(req: ParsePatientRequest):
    """Convert natural language patient input into structured data."""
    try:
        result = await ai_parse_patient(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    """Recommend clinics based on location, symptoms, wait time, and specialization."""
    try:
        # ── Fetch nearby clinics from DB ──────────────────────────────────────
        # Replace this block with your actual MongoDB geospatial query:
        #
        # nearby = await clinics_collection.find({
        #     "location": {
        #         "$near": {
        #             "$geometry": {"type": "Point", "coordinates": [req.lng, req.lat]},
        #             "$maxDistance": 10000
        #         }
        #     },
        #     "is_open": True
        # }).to_list(10)
        #
        # For now, using a placeholder:
        nearby = []  # TODO: replace with DB query

        if not nearby:
            return {"recommendations": []}

        recommendations = await ai_recommend_clinics(req.symptoms, nearby)
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predict-wait/{clinic_id}", response_model=PredictWaitResponse)
async def predict_wait(clinic_id: str):
    """Recompute ETA for the entire clinic queue using AI."""
    try:
        from datetime import date

        # ── Fetch today's queue from DB ───────────────────────────────────────
        # Replace with your actual DB query:
        #
        # today = date.today().isoformat()
        # tokens = await queue_tokens_collection.find({
        #     "clinic_id": clinic_id,
        #     "date": today,
        #     "status": "WAITING"
        # }).to_list(None)
        #
        # clinic = await clinics_collection.find_one({"_id": clinic_id})
        # doctor = await doctors_collection.find_one({"clinic_id": clinic_id, "is_available": True})
        #
        # For now, using placeholders:
        tokens = []          # TODO: replace with DB query
        avg_consult = 10     # TODO: pull from doctor.avg_consult_mins
        delay_mins = 0       # TODO: pull from doctor.delay_mins
        delay_buffer = 5     # TODO: pull from clinic.delay_buffer

        updated = await ai_predict_wait(tokens, avg_consult, delay_mins, delay_buffer)

        # ── Write updated ETAs back to DB ─────────────────────────────────────
        # for item in updated:
        #     await queue_tokens_collection.update_one(
        #         {"_id": item["token_id"]},
        #         {"$set": {"est_wait_mins": item["est_wait_mins"]}}
        #     )

        return {"clinic_id": clinic_id, "updated_tokens": len(updated)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
