from beanie import init_beanie
from fastapi import FastAPI

from app.db.mongodb import close_mongo_connection, connect_to_mongo
from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.notification import Notification
from app.models.queue_token import QueueToken
from app.models.review import Review
from app.models.user import User

app = FastAPI(
    title="CareQueue API",
    description="Backend starter for the CareQueue project.",
    version="0.1.0",
)


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
    return {"status": "ok", "service": "CareQueue API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "clinicflow-backend"}
