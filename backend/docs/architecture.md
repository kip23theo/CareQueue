# CareQueue Backend Architecture

## High-Level Architecture

CareQueue backend is a FastAPI service that manages multi-tenant clinic queues, staff actions, patient token status, real-time updates, and AI-assisted predictions.

Core layers:

- FastAPI backend for REST APIs and SSE streams
- MongoDB Atlas for all persistent data (8 collections)
- SSE real-time updates for queue changes (heartbeat-only for now)
- AI layer via OpenAI for clinic recommendation, wait prediction, patient parsing, and chat assistant
- Multi-tenant model: super admin → clinics → staff (admin/doctor/receptionist) → patients

## Multi-Tenant Flow

```text
Super Admin → approves clinics
Clinic Admin → registers clinic + staff via /auth/register-clinic
Patients → self-register via /auth/register-patient
```

New clinics start with `verification_status: pending`. Super admin must approve before staff can log in. Login checks verification status and blocks access for pending/rejected clinics.

## Data Flow

```text
Patient → /tokens/join → QueueToken created → position + ETA calculated
Staff → /admin/queue/next → token status changes → positions recalculated
All clients → /clinics/{id}/sse → live updates (heartbeat for now)
```

1. Patient joins a clinic queue through the API.
2. API creates a `queue_tokens` document with auto-incremented token number and calculated position.
3. If no doctor_id specified, the first available doctor is auto-assigned.
4. Queue position and ETA are recalculated on every status change (cancel, skip, next, complete).
5. Backend sends SSE heartbeats (real change detection not yet wired).

## Collections

| Collection | Purpose | Hot? |
| --- | --- | --- |
| `clinics` | Clinic profiles, verification, settings | No |
| `users` | All user accounts (5 roles) | No |
| `doctors` | Doctor profiles, availability, delay | No |
| `queue_tokens` | Live queue state | **Yes** |
| `notifications` | Notification log | No |
| `reviews` | Clinic and doctor reviews | No |
| `medical_history` | Patient visit records | No |
| `medical_documents` | Uploaded document metadata | No |

## Queue Tokens

`queue_tokens` is the hot collection. Most real-time reads and writes hit this collection because token status, position, ETA, and consultation timing change frequently during clinic operations.

Important indexes:

- `clinic_id + date` (daily queue lookup)
- `status` (filter by state)
- `position` (ordering)

## Queue Status State Machine

```text
WAITING → CALLED → IN_CONSULTATION → COMPLETED
WAITING → CANCELLED (by patient)
WAITING → SKIPPED (by staff, moves to end)
CALLED → NO_SHOW (5+ min no arrival)
Any → EMERGENCY (bumps to position 1)
```

Terminal states: COMPLETED, CANCELLED, NO_SHOW. Cannot transition out of these.

## ETA Calculation

ETA is recalculated whenever queue state changes: join, cancel, call next, skip, emergency, consultation start/complete, doctor delay change.

Current formula (simple):

```text
est_wait_mins = position × avg_consult_time
```

Walk-in add formula (includes doctor-specific data):

```text
est_wait_mins = (position × doctor.avg_consult_mins) + doctor.delay_mins + clinic.delay_buffer
```

After cancel, all WAITING tokens behind the cancelled position are shifted down by 1 and their ETAs are recalculated.

## SSE System

Current state: heartbeat-only. Sends initial `connected` event, then pings every 15 seconds.

Planned events:

- `queue_updated` — any status change
- `token_called` — doctor clicks Next
- `wait_time_changed` — ETA recalculated
- `doctor_status_changed` — availability/delay toggle
- `emergency_added` — token flagged EMERGENCY

## AI Features

All AI features use OpenAI via `AsyncOpenAI` client. Model configurable via `OPENAI_MODEL` env var (default: `gpt-4o-mini`).

| Feature | Endpoint | Status |
| --- | --- | --- |
| Patient chat assistant | `POST /ai/chat` | ✅ Working |
| NL patient parsing | `POST /ai/parse-patient` | ✅ Working |
| Clinic recommendation | `POST /ai/recommend` | ❌ Stubbed |
| Queue ETA prediction | `GET /ai/predict-wait/{id}` | ❌ Stubbed |

## Dependencies

```text
beanie==1.29.0          # MongoDB ODM
email-validator==2.3.0  # Pydantic EmailStr support
fastapi==0.115.6        # Web framework
motor==3.6.0            # Async MongoDB driver
pydantic-settings==2.7.1 # Settings management
python-dotenv==1.0.1    # .env file loading
uvicorn[standard]==0.34.0 # ASGI server
openai>=1.0.0           # AI features
```

## Known Limitations

- Auth tokens are random strings with no JWT/session validation. No auth middleware on any route — all endpoints are publicly accessible.
- Password hashing uses SHA-256 (should be bcrypt/argon2 for production).
- SSE only sends heartbeats, no real queue change broadcasting.
- AI recommend and predict-wait endpoints are stubbed.
- No rate limiting or request validation middleware.
