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

4. Run the development server:

   ```bash
   uvicorn app.main:app --reload
   ```

5. Open the API docs:

   ```text
   http://127.0.0.1:8000/docs
   ```

## Documentation

- API: ./docs/api.md
- Schema: ./docs/schema.md
- Architecture: ./docs/architecture.md
