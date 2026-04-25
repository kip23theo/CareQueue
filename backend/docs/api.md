# CareQueue Backend API Documentation

## Implementation Status Legend

- ✅ Implemented and tested
- ⚙️ Implemented, not yet tested against live DB
- ❌ Not yet implemented

## Auth

### POST `/auth/login` ✅

Login for all user roles (super_admin, admin, doctor, receptionist, patient).

Checks clinic verification status for staff users. Super admin and patient users skip clinic checks.

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
  "access_token": "random_token_string",
  "token_type": "bearer",
  "user": {
    "id": "user_id",
    "name": "Admin Name",
    "email": "admin@cityclinic.com",
    "role": "admin",
    "clinic_id": "clinic_id",
    "phone": null
  }
}
```

Note: Access tokens are random strings (`secrets.token_urlsafe`), not JWTs. No auth middleware validates them on protected routes yet.

### POST `/auth/register-clinic` ⚙️

Register a new clinic with admin account and optional staff members. New clinics start with `verification_status: "pending"` and require super admin approval.

Request body:

```json
{
  "clinic_name": "City Clinic",
  "address": "Main Road",
  "phone": "+919999999999",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "specializations": ["general"],
  "avg_consult_time": 10,
  "admin_name": "Admin",
  "admin_email": "admin@cityclinic.com",
  "admin_password": "password123",
  "staff": [
    {
      "name": "Dr. Priya",
      "email": "priya@cityclinic.com",
      "password": "password123",
      "role": "doctor",
      "specialization": "General Physician"
    }
  ]
}
```

Response (201):

```json
{
  "message": "Clinic registered successfully. Awaiting super admin verification.",
  "clinic_id": "clinic_id",
  "verification_status": "pending"
}
```

### POST `/auth/register-staff` ⚙️

Register a doctor or receptionist user for an existing clinic. Creates a Doctor document automatically for doctor role.

### POST `/auth/register-patient` ⚙️

Register a patient account for the patient portal.

### POST `/auth/bootstrap-super-admin` ⚙️

Create the first super admin user. Fails if one already exists (409).

### POST `/auth/refresh` ✅

Returns a new random access token. Does not validate the input token.

## Clinics (Patient-Facing)

### GET `/clinics/nearby` ✅

Get nearby clinics sorted by distance with live queue count and ETA.

Query params: `lat`, `lng`, `radius`

Note: Uses Manhattan distance approximation, not real geospatial query. Radius param is accepted but ignored.

### GET `/clinics/{id}` ✅

Get full clinic details and linked doctors.

### GET `/clinics/{id}/queue/live` ✅

Get current queue snapshot for patient view: current token, waiting list, called list, completed/skipped/no-show counts.

### GET `/clinics/{id}/doctors` ✅

Get doctor list for a clinic.

### GET `/clinics/{id}/sse` ⚙️

SSE stream for live queue events. Currently sends initial event + heartbeats every 15s. Real change detection not yet implemented.

## Queue Tokens (Patient)

### POST `/tokens/join` ✅

Join clinic queue. If `doctor_id` is not provided, auto-assigns the first available doctor at the clinic (404 if none available).

Request body:

```json
{
  "clinic_id": "clinic_id",
  "doctor_id": "doctor_id (optional)",
  "patient_name": "Rahul",
  "patient_phone": "+919999999999",
  "patient_age": 25,
  "symptoms": "Fever and headache"
}
```

Response (201):

```json
{
  "token_id": "token_id",
  "clinic_id": "clinic_id",
  "doctor_id": "doctor_id",
  "token_number": 14,
  "status": "WAITING",
  "position": 5,
  "est_wait_mins": 40,
  "joined_at": "2026-04-25T09:00:00Z",
  "updated_at": "2026-04-25T09:00:00Z"
}
```

Errors: invalid clinic_id → 400, clinic not found → 404, invalid doctor_id → 400, doctor not found or not in clinic → 404.

### GET `/tokens/{id}/status` ✅

Get live token status, position, and updated ETA.

Response:

```json
{
  "token_id": "token_id",
  "clinic_id": "clinic_id",
  "doctor_id": "doctor_id",
  "token_number": 14,
  "status": "WAITING",
  "position": 5,
  "est_wait_mins": 40,
  "joined_at": "2026-04-25T09:00:00Z",
  "updated_at": "2026-04-25T09:00:00Z"
}
```

Errors: invalid token_id → 400, token not found → 404.

### PATCH `/tokens/{id}/cancel` ✅

Cancel a WAITING or CALLED token. Reorders remaining WAITING queue positions and recalculates ETAs.

Errors: invalid token_id → 400, token not found → 404, already COMPLETED/CANCELLED/NO_SHOW → 400, status is IN_CONSULTATION/EMERGENCY/SKIPPED → 400.

Response:

```json
{
  "token_id": "token_id",
  "status": "CANCELLED",
  "updated_at": "2026-04-25T09:05:00Z"
}
```

## Queue Management (Admin/Staff)

### GET `/admin/queue` ⚙️

Get full queue for today (or specified date) with all statuses.

Query params: `clinic_id` (required), `date` (optional, YYYY-MM-DD)

Response includes: `tokens`, `current_token`, `waiting`, `called`, `completed_count`, `skipped_count`, `no_show_count`.

### POST `/admin/queue/add` ⚙️

Add walk-in patient manually. Requires `clinic_id` and `doctor_id`.

### POST `/admin/queue/next` ⚙️

Call next waiting patient. Tries doctor-specific queue first, then falls back to any waiting token. Recalculates positions after.

### PATCH `/admin/tokens/{id}/skip` ⚙️

Mark token as SKIPPED. Recalculates waiting positions.

### PATCH `/admin/tokens/{id}/emergency` ⚙️

Mark token as EMERGENCY, set position to 1.

### PATCH `/admin/tokens/{id}/start` ⚙️

Mark token as IN_CONSULTATION, record `consult_start` timestamp.

### PATCH `/admin/tokens/{id}/complete` ⚙️

Mark token as COMPLETED, record `consult_end` timestamp.

### PATCH `/admin/tokens/{id}/no-show` ⚙️

Mark token as NO_SHOW.

### GET `/admin/clinics/{clinic_id}/doctors` ⚙️

Get all doctors for a clinic (admin view).

### PATCH `/admin/clinics/{clinic_id}` ⚙️

Update clinic profile fields (name, address, phone, specializations, opening_hours, avg_consult_time, is_open, delay_buffer, location).

### GET `/admin/clinics/{clinic_id}/analytics` ⚙️

Get daily analytics: total patients, completed, cancelled, no-shows, avg wait time, avg consult time, peak hour, hourly throughput array.

Query params: `date` (optional, YYYY-MM-DD)

## Doctors

### GET `/doctors/{id}/queue` ✅

Get doctor's own queue: current token + next 5 waiting. Resolves by doctor_id or user_id.

### PATCH `/doctors/{id}/availability` ✅

Toggle doctor availability.

### PATCH `/doctors/{id}/delay` ✅

Set delay minutes (0–240).

## Super Admin

### GET `/super-admin/overview` ⚙️

Dashboard stats: clinic counts by verification status, user counts by role.

### GET `/super-admin/clinics` ⚙️

List all clinics with admin info and user counts. Optional filter by `verification_status`.

### PATCH `/super-admin/clinics/{clinic_id}/verification` ⚙️

Approve or reject a clinic. Sets `is_open` to true on approval, false on rejection.

### GET `/super-admin/users` ⚙️

List all users. Optional filters: `clinic_id`, `role`.

## Patients

### GET `/patients/{patient_user_id}/dashboard` ⚙️

Get patient profile, medical history timeline, and medical documents.

### GET `/patients/{patient_user_id}/medical-history` ⚙️

List medical history entries for a patient.

### POST `/patients/{patient_user_id}/medical-history` ⚙️

Create a medical history entry.

### GET `/patients/{patient_user_id}/documents` ⚙️

List medical documents for a patient.

### POST `/patients/{patient_user_id}/documents` ⚙️

Add medical document metadata.

## AI / Prediction

### POST `/ai/chat` ✅

Patient AI assistant for symptom triage and clinic Q&A. Requires `OPENAI_API_KEY`.

### POST `/ai/parse-patient` ✅

Convert natural language input into structured patient data `{name, age, symptoms}`. Requires `OPENAI_API_KEY`.

### POST `/ai/recommend` ❌

Recommend clinics based on location, symptoms, wait time. Currently stubbed — returns empty recommendations. TODO: wire up DB query for nearby clinics.

### GET `/ai/predict-wait/{clinic_id}` ❌

Recompute ETA for entire clinic queue. Currently stubbed — returns 0 updated. TODO: wire up DB query and write-back.

## Notifications

### POST `/notifications/send` ⚙️

Create a notification record (simulated send). Auto-generates message if not provided.

### GET `/notifications/log/{clinic_id}` ⚙️

Get notification history for a clinic with patient details.

## Reviews

### POST `/reviews` ⚙️

Create a review for a clinic or doctor. Auto-refreshes clinic average rating.

Request body:

```json
{
  "clinic_id": "clinic_id",
  "target_type": "clinic",
  "rating": 5,
  "comment": "Fast service",
  "patient_name": "Rahul"
}
```

### GET `/reviews/clinic/{clinic_id}` ⚙️

List clinic-targeted reviews.

### GET `/reviews/doctor/{doctor_id}` ⚙️

List doctor-targeted reviews.

### GET `/reviews/patient/{patient_user_id}` ⚙️

List reviews authored by a patient.

### GET `/reviews/clinic/{clinic_id}/summary` ⚙️

Get clinic review summary with per-doctor rating breakdowns.

### GET `/reviews/{clinic_id}` ⚙️

Legacy route — redirects to `GET /reviews/clinic/{clinic_id}`.
