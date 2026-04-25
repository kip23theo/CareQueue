from beanie import init_beanie
from fastapi import FastAPI

from app.api.routes.clinics import router as clinics_router
from app.core.config import get_settings
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
    description="Backend starter for the CareQueue project.",
    version="0.1.0",
)

app.include_router(clinics_router, prefix="/clinics", tags=["clinics"])


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


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok", "service": "carequeue-backend"}


@app.get("/health")
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
