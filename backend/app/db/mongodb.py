from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

mongo_client: AsyncIOMotorClient | None = None
mongo_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> AsyncIOMotorDatabase:
    """Create the shared MongoDB client and database handle."""
    global mongo_client, mongo_database

    settings = get_settings()
    mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
    mongo_database = mongo_client[settings.database_name]
    return mongo_database


async def close_mongo_connection() -> None:
    """Close the shared MongoDB client."""
    global mongo_client, mongo_database

    if mongo_client is not None:
        mongo_client.close()

    mongo_client = None
    mongo_database = None


def get_database() -> AsyncIOMotorDatabase:
    """Return the active MongoDB database handle."""
    if mongo_database is None:
        raise RuntimeError("MongoDB connection has not been initialized")

    return mongo_database


# MongoDB is schemaless, so documents in the same collection do not need to
# have identical fields like rows in a SQL table.
#
# This file is only the connection layer. Beanie will sit on top of Motor and
# provide ORM-like document validation through Pydantic models.
#
# New optional fields can be saved without SQL-style migrations, but major data
# shape changes should later use explicit migration scripts.
#
# Beanie can create indexes from document model definitions during startup.
