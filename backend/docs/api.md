# ClinicFlow Backend API Documentation

## Auth

### POST `/auth/login`

Clinic admin, doctor, or receptionist login. Returns JWT tokens.

Request body:

```json
{
  "email": "admin@cityclinic.com",
  "password": "password123"
}
```

Response:

```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "user": {
    "id": "user_id",
    "role": "admin"
  }
}
```

### POST `/auth/refresh`

Refresh access token.

Request body:

```json
{
  "refresh_token": "jwt_refresh_token"
}
```

Response:

```json
{
  "access_token": "new_jwt_access_token"
}
```

## Clinics (Patient-Facing)

### GET `/clinics/nearby`

Get nearby clinics sorted with live queue count and ETA.

Query params: `lat`, `lng`, `radius`

Response:

```json
{
  "clinics": [
    {
      "id": "clinic_id",
      "name": "City Clinic",
      "distance_km": 1.4,
      "queue_count": 8,
      "est_wait_mins": 35
    }
  ]
}
```

### GET `/clinics/{id}`

Get full clinic details, doctors, and live status.

Response:

```json
{
  "id": "clinic_id",
  "name": "City Clinic",
  "address": "Main Road",
  "is_open": true,
  "doctors": []
}
```

### GET `/clinics/{id}/queue/live`

Get current queue snapshot for patient view.

Response:

```json
{
  "clinic_id": "clinic_id",
  "queue_length": 8,
  "current_token": 12,
  "next_token": 13
}
```

### GET `/clinics/{id}/sse`

Open SSE stream for live queue events.

Response event:

```json
{
  "type": "queue_updated",
  "clinic_id": "clinic_id"
}
```

## Queue Tokens (Patient)

### POST `/tokens/join`

Join clinic queue. Returns token number and estimated wait time.

Request body:

```json
{
  "clinic_id": "clinic_id",
  "doctor_id": "doctor_id",
  "patient_name": "Rahul",
  "patient_phone": "+919999999999",
  "patient_age": 25,
  "symptoms": "Fever and headache"
}
```

Response:

```json
{
  "token_id": "token_id",
  "token_number": 14,
  "position": 5,
  "est_wait_mins": 40
}
```

### GET `/tokens/{id}/status`

Get live token status, position, and updated ETA.

Response:

```json
{
  "token_id": "token_id",
  "status": "WAITING",
  "position": 5,
  "est_wait_mins": 40
}
```

### PATCH `/tokens/{id}/cancel`

Patient cancels their token.

Response:

```json
{
  "token_id": "token_id",
  "status": "CANCELLED"
}
```

## Queue Management (Admin)

### GET `/admin/queue`

Get full queue for today with all statuses.

Response:

```json
{
  "tokens": [
    {
      "id": "token_id",
      "token_number": 14,
      "patient_name": "Rahul",
      "status": "WAITING"
    }
  ]
}
```

### POST `/admin/queue/add`

Add walk-in patient manually.

Request body:

```json
{
  "clinic_id": "clinic_id",
  "doctor_id": "doctor_id",
  "patient_name": "Rahul",
  "patient_phone": "+919999999999",
  "symptoms": "Fever"
}
```

Response:

```json
{
  "token_id": "token_id",
  "token_number": 15,
  "status": "WAITING"
}
```

### POST `/admin/queue/next`

Call next patient and send notification.

Response:

```json
{
  "token_id": "token_id",
  "token_number": 14,
  "status": "CALLED"
}
```

### PATCH `/admin/tokens/{id}/skip`

Skip token and move it to the end of the queue.

Response:

```json
{
  "token_id": "token_id",
  "status": "SKIPPED"
}
```

### PATCH `/admin/tokens/{id}/emergency`

Bump token to the front and mark as emergency.

Response:

```json
{
  "token_id": "token_id",
  "status": "EMERGENCY",
  "position": 1
}
```

### PATCH `/admin/tokens/{id}/start`

Mark token as in consultation and start timer.

Response:

```json
{
  "token_id": "token_id",
  "status": "IN_CONSULTATION"
}
```

### PATCH `/admin/tokens/{id}/complete`

Mark token as completed and save visit duration.

Response:

```json
{
  "token_id": "token_id",
  "status": "COMPLETED",
  "duration_mins": 9
}
```

### PATCH `/admin/tokens/{id}/no-show`

Mark token as no-show.

Response:

```json
{
  "token_id": "token_id",
  "status": "NO_SHOW"
}
```

## Doctors

### GET `/doctors/{id}/queue`

Get doctor's own queue with current token and next 5 tokens.

Response:

```json
{
  "doctor_id": "doctor_id",
  "current": null,
  "next": []
}
```

### PATCH `/doctors/{id}/availability`

Toggle doctor availability.

Request body:

```json
{
  "is_available": false
}
```

Response:

```json
{
  "doctor_id": "doctor_id",
  "is_available": false
}
```

### PATCH `/doctors/{id}/delay`

Set delay minutes and recalculate ETAs.

Request body:

```json
{
  "delay_mins": 15
}
```

Response:

```json
{
  "doctor_id": "doctor_id",
  "delay_mins": 15
}
```

## Clinic Admin

### POST `/admin/clinics`

Create clinic profile.

Request body:

```json
{
  "name": "City Clinic",
  "address": "Main Road",
  "phone": "+919999999999"
}
```

Response:

```json
{
  "id": "clinic_id",
  "name": "City Clinic"
}
```

### PATCH `/admin/clinics/{id}`

Update clinic profile or opening status.

Request body:

```json
{
  "is_open": true,
  "delay_buffer": 5
}
```

Response:

```json
{
  "id": "clinic_id",
  "is_open": true
}
```

### GET `/admin/clinics/{id}/analytics`

Get daily stats including average wait, throughput, and no-shows.

Response:

```json
{
  "clinic_id": "clinic_id",
  "avg_wait_mins": 22,
  "completed_today": 34,
  "no_shows": 3
}
```

## AI / Prediction

### POST `/ai/recommend`

Recommend clinics based on location, symptoms, wait time, and specialization.

Request body:

```json
{
  "lat": 28.61,
  "lng": 77.20,
  "symptoms": "Chest pain"
}
```

Response:

```json
{
  "recommendations": [
    {
      "clinic_id": "clinic_id",
      "rank": 1,
      "reason": "Cardiology support and lower wait time"
    }
  ]
}
```

### GET `/ai/predict-wait/{clinic_id}`

Recompute ETA for the entire clinic queue.

Response:

```json
{
  "clinic_id": "clinic_id",
  "updated_tokens": 8
}
```

### POST `/ai/chat`

Patient AI assistant for symptom triage and clinic Q&A.

Request body:

```json
{
  "message": "Should I go to City Clinic for fever?"
}
```

Response:

```json
{
  "reply": "City Clinic is open and has an estimated wait of 20 minutes."
}
```

### POST `/ai/parse-patient`

Convert natural language patient input into structured patient data.

Request body:

```json
{
  "text": "Add Rahul 25 fever"
}
```

Response:

```json
{
  "name": "Rahul",
  "age": 25,
  "symptoms": "fever"
}
```

## Notifications & Reviews

### POST `/notifications/send`

Send SMS, WhatsApp, or push notification simulation.

Request body:

```json
{
  "token_id": "token_id",
  "channel": "sms",
  "message": "Your turn is next."
}
```

Response:

```json
{
  "status": "sent"
}
```

### GET `/notifications/log/{clinic_id}`

Get notification history for a clinic.

Response:

```json
{
  "notifications": []
}
```

### POST `/reviews`

Submit patient review after visit.

Request body:

```json
{
  "clinic_id": "clinic_id",
  "token_id": "token_id",
  "rating": 5,
  "comment": "Fast service"
}
```

Response:

```json
{
  "review_id": "review_id",
  "rating": 5
}
```

### GET `/reviews/{clinic_id}`

Get clinic reviews.

Response:

```json
{
  "reviews": []
}
```
