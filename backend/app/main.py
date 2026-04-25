from dotenv import load_dotenv
load_dotenv()  # must be first, before any os.getenv() calls

from beanie import init_beanie
from fastapi import FastAPI

from app.api.routes.clinics import router as clinics_router
from app.api.routes.ai import router as ai_router          # ← add this
from app.db.mongodb import close_mongo_connection, connect_to_mongo
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.notification import Notification
from app.models.queue_token import QueueToken
from app.models.review import Review
from app.models.user import User

app = FastAPI(
    title="CareQueue API",
    description=(
        "ClinicFlow backend API for clinic discovery, live queue tracking, "
        "and queue management workflows."
    ),
    version="0.1.0",
)

app.include_router(clinics_router, prefix="/clinics", tags=["clinics"])
app.include_router(ai_router)                        # ← add this


@app.on_event("startup")
async def startup_event() -> None:
    database = await connect_to_mongo()
    await init_beanie(
        database=database,
        document_models=[
            Clinic,
            User,
            Doctor,
            QueueToken,
            Notification,
            Review,
        ],
    )


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await close_mongo_connection()


@app.get(
    "/",
    summary="API root",
    description="Basic root endpoint for confirming the API service is reachable.",
    tags=["system"],
)
def read_root() -> dict[str, str]:
    return {"status": "ok", "service": "CareQueue API"}


@app.get(
    "/health",
    summary="Health check",
    description="Simple health check with no database dependency.",
    tags=["system"],
)
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "clinicflow-backend"}