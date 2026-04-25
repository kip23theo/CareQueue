from dotenv import load_dotenv
load_dotenv()  # must be first, before any os.getenv() calls

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.ai import router as ai_router
from app.api.routes.auth import router as auth_router
from app.api.routes.clinics import router as clinics_router
from app.core.config import get_settings
from app.api.routes.tokens import router as tokens_router
from app.db.mongodb import close_mongo_connection, connect_to_mongo
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.notification import Notification
from app.models.queue_token import QueueToken
from app.models.review import Review
from app.models.user import User

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=(
        "ClinicFlow backend API for clinic discovery, live queue tracking, "
        "and queue management workflows."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(clinics_router, prefix="/clinics", tags=["clinics"])
app.include_router(ai_router)
app.include_router(tokens_router, prefix="/tokens", tags=["tokens"])


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
    return {"status": "ok", "service": "carequeue-backend"}


@app.get(
    "/health",
    summary="Health check",
    description="Simple health check with no database dependency.",
    tags=["system"],
)
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "carequeue-backend"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.env == "development",
    )
