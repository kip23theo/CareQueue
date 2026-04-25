# ClinicFlow Backend Runbook

Use this guide to set up, run, seed, and test the FastAPI backend locally.

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

## 5. Initialize MongoDB Indexes

This initializes Beanie ODM models and creates MongoDB indexes.

```bash
python scripts/init_db.py
```

Expected output:

```text
Beanie ODM indexes initialized for database: carequeue
```

## 6. Seed Demo Data

Use this when you need local/demo data for clinic endpoints.

```bash
python scripts/seed_data.py
```

This creates:

- 3 demo clinics
- 5 demo doctors
- 8 queue tokens for the primary demo clinic

The script is safe to rerun because it deletes its own demo records first.

## 7. Run Backend Server

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

## 8. Test Main Clinic Endpoints

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
