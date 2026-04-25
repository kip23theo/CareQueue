# CareQueue Backend Runbook

Use this guide to set up and run the FastAPI backend locally.

## Prerequisites

- Python 3.11+
- Access to the shared MongoDB URI
- Project cloned locally

## 1. Move Into Backend

```bash
cd backend
```

## 2. Create Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

If `python3` is not available, use the Python command available on your machine.

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs: beanie, email-validator, fastapi, motor, pydantic-settings, python-dotenv, uvicorn, openai.

## 4. Create Local Env File

```bash
cp .env.example .env
```

Update `backend/.env`:

```env
APP_NAME="CareQueue Backend"
ENV="development"
PORT=8000
MONGODB_URI="<shared MongoDB URI>"
DATABASE_NAME="carequeue"
OPENAI_API_KEY="<your OpenAI API key>"
OPENAI_MODEL="gpt-4o-mini"
CORS_ALLOW_ORIGINS="http://localhost:3000"
```

Never commit `backend/.env`. It contains secrets and is ignored by git.

## 5. Run Backend Server

```bash
python -m app.main
```

Server URL:

```text
http://127.0.0.1:<PORT>
```

Swagger docs:

```text
http://127.0.0.1:<PORT>/docs
```

Every new backend endpoint should include Swagger metadata when it is added:

- `response_model`
- `summary`
- `description`
- important `responses`
- query/path parameter descriptions

## 6. Test Key Endpoints

Health check:

```text
GET /health
```

Nearby clinics:

```text
GET /clinics/nearby?lat=28.6139&lng=77.2090&radius=5
```

Clinic detail:

```text
GET /clinics/{clinic_id}
```

Live clinic queue:

```text
GET /clinics/{clinic_id}/queue/live
```

Join queue:

```text
POST /tokens/join
Body: {"clinic_id": "...", "patient_name": "Test", "patient_phone": "+919999999999"}
```

Token status:

```text
GET /tokens/{token_id}/status
```

Cancel token:

```text
PATCH /tokens/{token_id}/cancel
```

Admin queue:

```text
GET /admin/queue?clinic_id=...
```

## Expected Validation Behavior

- Invalid ObjectId format returns `400`
- Valid ObjectId with no matching document returns `404`
- Empty data returns an empty list
- ObjectIds are returned as strings in all responses
- `doctor_id` returns `null` (not `"None"`) when unset

## Route Prefixes

| Prefix | Tag | Purpose |
| --- | --- | --- |
| `/auth` | auth | Login, registration, token refresh |
| `/clinics` | clinics | Patient-facing clinic discovery |
| `/tokens` | tokens | Patient queue token operations |
| `/doctors` | doctors | Doctor queue and settings |
| `/admin` | admin | Staff queue management and clinic admin |
| `/super-admin` | super-admin | Platform-level clinic verification |
| `/patients` | patients | Patient dashboard and medical records |
| `/notifications` | notifications | Notification log and send |
| `/reviews` | reviews | Clinic and doctor reviews |
| `/ai` | ai | AI chat, parse, recommend, predict |

## Database Maintenance

The team uses a shared MongoDB Atlas database. Most teammates should not run database init or seed scripts during normal setup.

Only run these when the backend owner asks you to refresh indexes or demo data:

```bash
python scripts/init_db.py
python scripts/seed_data.py
```

`seed_data.py` prints all generated IDs (clinics, doctors, tokens) for Swagger testing. It deletes existing demo data before inserting fresh records.

Demo logins after seeding:

```text
admin@demo.carequeue.local / password123
doctor@demo.carequeue.local / password123
receptionist@demo.carequeue.local / password123
```

Note: Seeded clinics have `verification_status: pending` by default. To test staff login, either approve the clinic via super admin endpoint or update the DB directly.

## Git Rules

Commit source files and docs only.

Do not commit:

- `backend/.env`
- `backend/.venv/`
- `__pycache__/`
- local logs or temporary output files

## Useful Docs

- API docs: `backend/docs/api.md`
- MongoDB schema: `backend/docs/schema.md`
- Architecture: `backend/docs/architecture.md`
