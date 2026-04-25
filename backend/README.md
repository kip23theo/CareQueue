# CareQueue Backend

FastAPI backend for CareQueue — multi-tenant clinic queue management with AI features.

## Quick Start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MongoDB URI and OpenAI key
python -m app.main
```

Swagger docs: `http://127.0.0.1:8000/docs`

## API Domains

| Domain | Prefix | Endpoints |
| --- | --- | --- |
| Auth | `/auth` | login, register-clinic, register-staff, register-patient, bootstrap-super-admin, refresh |
| Clinics | `/clinics` | nearby, detail, live queue, doctors, SSE |
| Tokens | `/tokens` | join, status, cancel |
| Admin | `/admin` | queue, add walk-in, call next, skip, emergency, start, complete, no-show, clinic update, analytics |
| Super Admin | `/super-admin` | overview, list clinics, verify clinic, list users |
| Doctors | `/doctors` | queue, availability, delay |
| Patients | `/patients` | dashboard, medical history, documents |
| Notifications | `/notifications` | send, log |
| Reviews | `/reviews` | create, list by clinic/doctor/patient, summary |
| AI | `/ai` | chat, parse-patient, recommend (stubbed), predict-wait (stubbed) |

## Shared Database

Uses shared MongoDB Atlas. Do not run `seed_data.py` without coordinating with the team.

## Documentation

- API: [docs/api.md](docs/api.md)
- Schema: [docs/schema.md](docs/schema.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Runbook: [docs/runbook.md](docs/runbook.md)
