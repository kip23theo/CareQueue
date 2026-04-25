import json
import os
import re
from typing import Any, Optional

from openai import AsyncOpenAI

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def get_openai_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    return AsyncOpenAI(api_key=api_key)


def _extract_json(raw: str) -> Any | None:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    obj_start = text.find("{")
    obj_end = text.rfind("}")
    if obj_start != -1 and obj_end > obj_start:
        try:
            return json.loads(text[obj_start:obj_end + 1])
        except json.JSONDecodeError:
            pass

    arr_start = text.find("[")
    arr_end = text.rfind("]")
    if arr_start != -1 and arr_end > arr_start:
        try:
            return json.loads(text[arr_start:arr_end + 1])
        except json.JSONDecodeError:
            pass

    return None


def _to_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _to_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _heuristic_clinic_score(symptoms: str, clinic: dict[str, Any]) -> float:
    symptom_terms = {term.strip().lower() for term in re.split(r"[,/ ]+", symptoms) if term.strip()}
    specs = {str(item).strip().lower() for item in clinic.get("specializations", [])}

    symptom_match = 0.0
    if symptom_terms and specs:
        hit_count = sum(
            1
            for term in symptom_terms
            if any(term in spec or spec in term for spec in specs)
        )
        symptom_match = min(1.0, hit_count / max(len(symptom_terms), 1))

    distance_km = max(0.0, _to_float(clinic.get("distance_km"), 20.0))
    wait_mins = max(0.0, _to_float(clinic.get("est_wait_mins"), 120.0))
    rating = _to_float(clinic.get("rating"), 0.0)

    distance_score = max(0.0, 1.0 - (distance_km / 10.0))
    wait_score = max(0.0, 1.0 - (wait_mins / 90.0))
    rating_score = max(0.0, min(1.0, rating / 5.0))

    weighted = (symptom_match * 0.35) + (distance_score * 0.25) + (wait_score * 0.25) + (rating_score * 0.15)
    return round(weighted * 100.0, 2)


def _estimate_reach_mins(distance_km: Any) -> int | None:
    distance = _to_float(distance_km, fallback=-1.0)
    if distance < 0:
        return None
    # Approximate city traffic speed for patient-facing ETA.
    minutes = int(round((distance / 25.0) * 60.0))
    return max(1, minutes)


def _normalize_clinic_context(clinic_context: Any) -> dict[str, Any] | None:
    if clinic_context is None:
        return None

    if isinstance(clinic_context, dict):
        normalized: dict[str, Any] = dict(clinic_context)
    elif isinstance(clinic_context, list):
        normalized = {"clinics": clinic_context}
    else:
        return {"raw_context": str(clinic_context)}

    clinics = normalized.get("clinics")
    if isinstance(clinics, list):
        clinic_rows: list[dict[str, Any]] = []
        for clinic in clinics[:20]:
            if not isinstance(clinic, dict):
                continue
            row = dict(clinic)
            if row.get("estimated_reach_mins") is None:
                reach_mins = _estimate_reach_mins(row.get("distance_km"))
                if reach_mins is not None:
                    row["estimated_reach_mins"] = reach_mins
            rating = _to_float(row.get("rating"), fallback=-1.0)
            if rating >= 0 and not row.get("review_signal"):
                row["review_signal"] = f"{rating:.1f}/5 from patient reviews"
            clinic_rows.append(row)
        normalized["clinics"] = clinic_rows

    return normalized


async def ai_chat(message: str, clinic_context: Optional[dict[str, Any] | list[dict[str, Any]]] = None) -> str:
    normalized_context = _normalize_clinic_context(clinic_context)
    system = (
        "You are ClinicFlow AI in CareQueue. Help patients understand clinic wait times, "
        "reach times, and review quality to choose care centers safely. "
        "Keep responses concise and friendly. "
        "If symptoms suggest emergency risk (like chest pain, severe breathing trouble, stroke signs), "
        "recommend urgent in-person care immediately. "
        "When live clinic context is provided, treat it as source of truth for numbers and clinic names. "
        "Do not invent or guess clinic data. If a requested value is missing, clearly say it is unavailable. "
        "When comparing clinics, prioritize and mention these in order when available: "
        "estimated wait mins, estimated reach mins (or distance), and review quality."
    )
    if normalized_context:
        system += (
            "\n\nLive clinic context (JSON):\n"
            f"{json.dumps(normalized_context, ensure_ascii=True)}"
        )

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": message},
            ],
            max_tokens=320,
            temperature=0.4,
        )
        content = response.choices[0].message.content or ""
        return content.strip() or "I can help with clinic choices and wait-time guidance."
    except Exception:
        return (
            "I can still help with basics right now: compare nearest clinics, choose shorter wait times, "
            "and seek urgent care immediately for severe symptoms."
        )


async def ai_parse_patient(text: str) -> dict[str, Any]:
    fallback: dict[str, Any] = {
        "name": "",
        "age": None,
        "symptoms": "",
        "gender": None,
        "confidence": 0.2,
    }

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract patient details from receptionist text. "
                        "Return ONLY JSON with keys: name (string), age (int|null), symptoms (string), "
                        "gender (male|female|other|null), confidence (0..1)."
                    ),
                },
                {"role": "user", "content": text},
            ],
            max_tokens=140,
            temperature=0,
        )
        raw = response.choices[0].message.content or ""
        payload = _extract_json(raw)
        if isinstance(payload, dict):
            name = str(payload.get("name", "")).strip()
            symptoms = str(payload.get("symptoms", "")).strip()
            age = payload.get("age")
            age_value = _to_int(age, fallback=-1) if age is not None else None
            if age_value is not None and age_value < 0:
                age_value = None
            gender = payload.get("gender")
            normalized_gender = str(gender).strip().lower() if gender is not None else None
            if normalized_gender not in {"male", "female", "other"}:
                normalized_gender = None
            confidence = max(0.0, min(1.0, _to_float(payload.get("confidence"), 0.75)))
            return {
                "name": name,
                "age": age_value,
                "symptoms": symptoms,
                "gender": normalized_gender,
                "confidence": confidence,
            }
    except Exception:
        pass

    # Regex fallback for simple receptionist phrase formats.
    age_match = re.search(r"\b(\d{1,3})\b", text)
    name_match = re.search(r"add\s+([A-Za-z][A-Za-z .'-]+?)(?:,|\d|with|for|$)", text, flags=re.IGNORECASE)
    gender_match = re.search(r"\b(male|female|other)\b", text, flags=re.IGNORECASE)
    symptom_match = re.search(r"(?:with|for)\s+(.+)$", text, flags=re.IGNORECASE)

    fallback["name"] = name_match.group(1).strip() if name_match else ""
    fallback["age"] = _to_int(age_match.group(1), fallback=-1) if age_match else None
    if fallback["age"] is not None and fallback["age"] < 0:
        fallback["age"] = None
    fallback["gender"] = gender_match.group(1).lower() if gender_match else None
    fallback["symptoms"] = symptom_match.group(1).strip() if symptom_match else text.strip()
    return fallback


async def ai_recommend_clinics(symptoms: str, nearby_clinics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not nearby_clinics:
        return []

    clinics_summary = json.dumps(nearby_clinics, ensure_ascii=True)

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are ClinicFlow AI. Rank the best 1-3 clinics using symptom match, distance, "
                        "wait time, rating, and specialization relevance. Return ONLY JSON in this shape: "
                        "{\"recommendations\": [{\"clinic_id\": \"...\", \"rank\": 1, \"reason\": \"...\", \"score\": 0-100}]}"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Patient symptoms: {symptoms}\nClinics available: {clinics_summary}",
                },
            ],
            max_tokens=500,
            temperature=0.2,
        )
        raw = response.choices[0].message.content or ""
        payload = _extract_json(raw)
        recs_payload = []
        if isinstance(payload, dict):
            maybe_recs = payload.get("recommendations")
            if isinstance(maybe_recs, list):
                recs_payload = maybe_recs
        elif isinstance(payload, list):
            recs_payload = payload

        recs: list[dict[str, Any]] = []
        for idx, item in enumerate(recs_payload, start=1):
            if not isinstance(item, dict):
                continue
            clinic_id = str(item.get("clinic_id", "")).strip()
            if not clinic_id:
                continue
            recs.append(
                {
                    "clinic_id": clinic_id,
                    "rank": max(1, _to_int(item.get("rank"), idx)),
                    "reason": str(item.get("reason", "Good overall match")).strip() or "Good overall match",
                    "score": max(0.0, min(100.0, _to_float(item.get("score"), 0.0))),
                }
            )

        if recs:
            recs.sort(key=lambda row: row["rank"])
            return recs[:3]
    except Exception:
        pass

    scored = sorted(
        nearby_clinics,
        key=lambda clinic: _heuristic_clinic_score(symptoms, clinic),
        reverse=True,
    )[:3]

    results: list[dict[str, Any]] = []
    for rank, clinic in enumerate(scored, start=1):
        clinic_id = str(clinic.get("id") or clinic.get("clinic_id") or "")
        if not clinic_id:
            continue
        score = _heuristic_clinic_score(symptoms, clinic)
        distance = _to_float(clinic.get("distance_km"), 0.0)
        wait = _to_int(clinic.get("est_wait_mins"), 0)
        results.append(
            {
                "clinic_id": clinic_id,
                "rank": rank,
                "score": score,
                "reason": f"~{distance:.1f} km away with around {wait} min wait.",
            }
        )
    return results


async def ai_predict_wait(
    queue_tokens: list[dict[str, Any]],
    doctor_avg_consult_mins: int,
    doctor_delay_mins: int = 0,
    clinic_delay_buffer: int = 0,
) -> list[dict[str, Any]]:
    waiting = [token for token in queue_tokens if token.get("status") == "WAITING"]
    if not waiting:
        return []

    fallback_base = max(1, doctor_avg_consult_mins + doctor_delay_mins + clinic_delay_buffer)
    fallback = [
        {"token_id": str(token.get("token_id")), "est_wait_mins": max(0, _to_int(token.get("position"), 0) * fallback_base)}
        for token in waiting
    ]

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You estimate queue wait times. Baseline consult time is {doctor_avg_consult_mins} mins, "
                        f"doctor delay is {doctor_delay_mins} mins, clinic buffer is {clinic_delay_buffer} mins. "
                        "Return ONLY JSON array: [{\"token_id\":\"...\",\"est_wait_mins\": <int>}]."
                    ),
                },
                {"role": "user", "content": json.dumps(waiting, ensure_ascii=True)},
            ],
            max_tokens=420,
            temperature=0,
        )
        raw = response.choices[0].message.content or ""
        payload = _extract_json(raw)
        if not isinstance(payload, list):
            return fallback

        normalized: list[dict[str, Any]] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            token_id = str(item.get("token_id", "")).strip()
            if not token_id:
                continue
            wait = max(0, _to_int(item.get("est_wait_mins"), 0))
            normalized.append({"token_id": token_id, "est_wait_mins": wait})

        return normalized or fallback
    except Exception:
        return fallback


async def ai_generate_wait_notifications(
    *,
    clinic_name: str,
    updates: list[dict[str, Any]],
) -> dict[str, str]:
    if not updates:
        return {}

    fallback = {}
    for item in updates:
        token_label = str(item.get("token_display") or item.get("token_number") or "your token")
        wait_mins = max(0, _to_int(item.get("new_est_wait_mins"), 0))
        fallback[str(item.get("token_id", ""))] = (
            f"{token_label} updated at {clinic_name}. Estimated wait is now about {wait_mins} minutes."
        )

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Create patient-friendly wait time notifications for a clinic queue app. "
                        "Return ONLY JSON array with fields token_id and message. Keep each message under 220 chars."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {"clinic_name": clinic_name, "updates": updates},
                        ensure_ascii=True,
                    ),
                },
            ],
            max_tokens=500,
            temperature=0.5,
        )
        raw = response.choices[0].message.content or ""
        payload = _extract_json(raw)
        if not isinstance(payload, list):
            return fallback

        generated: dict[str, str] = {}
        for item in payload:
            if not isinstance(item, dict):
                continue
            token_id = str(item.get("token_id", "")).strip()
            message = str(item.get("message", "")).strip()
            if token_id and message:
                generated[token_id] = message

        return {**fallback, **generated}
    except Exception:
        return fallback
