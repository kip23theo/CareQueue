import asyncio
import os
import sys
from pathlib import Path

from beanie import init_beanie
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_DIR))

from app.models.clinic import Clinic
from app.models.doctor import Doctor
from app.models.notification import Notification
from app.models.queue_token import QueueToken
from app.models.review import Review
from app.models.user import User


async def init_db() -> None:
    env_path = BACKEND_DIR / ".env"
    load_dotenv(env_path)

    mongodb_uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("DATABASE_NAME", "carequeue")

    if not mongodb_uri or "PASTE_" in mongodb_uri:
        raise RuntimeError("Set MONGODB_URI in backend/.env before running this script")

    client = AsyncIOMotorClient(mongodb_uri)

    try:
        await init_beanie(
            database=client[database_name],
            document_models=[
                Clinic,
                User,
                Doctor,
                QueueToken,
                Notification,
                Review,
            ],
        )
        print(f"Beanie ODM indexes initialized for database: {database_name}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(init_db())
