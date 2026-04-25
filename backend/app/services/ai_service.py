"""
ClinicFlow AI Service — OpenAI Integration
Drop this file into: backend/app/services/ai_service.py
"""

import os
import json
from openai import AsyncOpenAI
from typing import Optional

# ── Client ────────────────────────────────────────────────────────────────────

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# ── 1. /ai/chat  — Patient assistant ─────────────────────────────────────────

async def ai_chat(message: str, clinic_context: Optional[dict] = None) -> str:
    """
    Patient-facing assistant for symptom triage and clinic Q&A.
    Pass clinic_context (name, is_open, est_wait_mins) if you have it.
    """
    system = (
        "You are a helpful medical assistant for ClinicFlow, a clinic queue app. "
        "Help patients understand wait times, triage symptoms (non-emergency only), "
        "and decide which clinic to visit. Always recommend seeing a doctor for any "
        "serious or emergency symptoms. Keep replies concise and friendly."
    )

    if clinic_context:
        system += f"\n\nClinic info: {json.dumps(clinic_context)}"

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": message},
        ],
        max_tokens=300,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


# ── 2. /ai/parse-patient  — NL → structured patient data ────────────────────

async def ai_parse_patient(text: str) -> dict:
    """
    Convert natural language like "Add Rahul 25 fever headache"
    into {"name": "Rahul", "age": 25, "symptoms": "fever, headache"}.
    """
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract patient info from the user's text. "
                    "Return ONLY valid JSON with keys: name (string), age (int or null), symptoms (string). "
                    "No markdown, no explanation."
                ),
            },
            {"role": "user", "content": text},
        ],
        max_tokens=100,
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return whatever we got with empty fields
        return {"name": "", "age": None, "symptoms": raw}


# ── 3. /ai/recommend  — Clinic recommendation ────────────────────────────────

async def ai_recommend_clinics(
    symptoms: str,
    nearby_clinics: list[dict],
) -> list[dict]:
    """
    Rank nearby clinics by suitability for the given symptoms.
    nearby_clinics: list of {id, name, specializations, queue_count, est_wait_mins, distance_km}
    Returns: [{clinic_id, rank, reason}, ...]
    """
    clinics_summary = json.dumps(nearby_clinics, indent=2)

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a medical triage assistant. Rank the given clinics for a patient "
                    "based on their symptoms, clinic specializations, wait time, and distance. "
                    "Return ONLY a JSON array: [{\"clinic_id\": \"...\", \"rank\": 1, \"reason\": \"...\"}]. "
                    "No markdown, no extra text."
                ),
            },
            {
                "role": "user",
                "content": f"Patient symptoms: {symptoms}\n\nNearby clinics:\n{clinics_summary}",
            },
        ],
        max_tokens=500,
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Return original order if parsing fails
        return [
            {"clinic_id": c["id"], "rank": i + 1, "reason": "Based on availability"}
            for i, c in enumerate(nearby_clinics)
        ]


# ── 4. /ai/predict-wait  — ETA prediction helper ─────────────────────────────

async def ai_predict_wait(
    queue_tokens: list[dict],
    doctor_avg_consult_mins: int,
    doctor_delay_mins: int = 0,
    clinic_delay_buffer: int = 0,
) -> list[dict]:
    """
    Recalculate estimated wait minutes for each WAITING token in the queue.
    Uses AI to factor in symptoms complexity on top of positional math.

    queue_tokens: list of {token_id, position, symptoms, status}
    Returns: [{token_id, est_wait_mins}, ...]
    """
    waiting = [t for t in queue_tokens if t.get("status") == "WAITING"]

    if not waiting:
        return []

    tokens_summary = json.dumps(waiting, indent=2)

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are a queue time estimator. Doctor averages {doctor_avg_consult_mins} mins per patient, "
                    f"current delay: {doctor_delay_mins} mins, clinic buffer: {clinic_delay_buffer} mins. "
                    "Estimate wait time for each patient considering their position and symptom complexity. "
                    "Return ONLY a JSON array: [{\"token_id\": \"...\", \"est_wait_mins\": <int>}]. "
                    "No markdown, no extra text."
                ),
            },
            {
                "role": "user",
                "content": f"Queue:\n{tokens_summary}",
            },
        ],
        max_tokens=400,
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: simple positional math
        base = doctor_avg_consult_mins + doctor_delay_mins + clinic_delay_buffer
        return [
            {"token_id": t["token_id"], "est_wait_mins": t["position"] * base}
            for t in waiting
        ]