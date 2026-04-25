# ClinicFlow Backend Runbook

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

## 4. Create Local Env File

```bash
cp .env.example .env
```

Update `backend/.env`:

```env
APP_NAME="ClinicFlow Backend"
ENV="development"
MONGODB_URI="<shared MongoDB URI>"
DATABASE_NAME="carequeue"
ANTHROPIC_API_KEY="<optional for now>"
```

Never commit `backend/.env`. It contains secrets and is ignored by git.

## 5. Run Backend Server

```bash
uvicorn app.main:app --reload
```

Server URL:

```text
http://127.0.0.1:8000
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

Every new backend endpoint should include Swagger metadata when it is added:

- `response_model`
- `summary`
- `description`
- important `responses`
- query/path parameter descriptions

## 6. Test Main Clinic Endpoints

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

Health check:

```text
GET /health
```

## Expected Validation Behavior

- Invalid ObjectId format returns `400`
- Valid ObjectId with no clinic returns `404`
- Empty data returns an empty list
- ObjectIds are returned as strings

## Database Maintenance

The team uses a shared MongoDB Atlas database. Most teammates should not run database init or seed scripts during normal setup.

Only run these when the backend owner asks you to refresh indexes or demo data:

```bash
python scripts/init_db.py
python scripts/seed_data.py
```

`seed_data.py` changes shared demo data, so coordinate before running it.

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
