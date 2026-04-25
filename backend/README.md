# CareQueue Backend

FastAPI backend starter for CareQueue.

## Demo Setup

1. Create and activate a virtual environment:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   Then set `PORT` in `backend/.env` if you want to run on a custom port.

4. Run the development server:

   ```bash
   python -m app.main
   ```

5. Open the API docs:

   ```text
   http://127.0.0.1:<PORT>/docs
   ```

## MongoDB ODM Setup

Initialize Beanie models and MongoDB indexes:

```bash
cd backend
python scripts/init_db.py
```

## Documentation

- API: ./docs/api.md
- Schema: ./docs/schema.md
- Architecture: ./docs/architecture.md
- Runbook: ./docs/runbook.md
