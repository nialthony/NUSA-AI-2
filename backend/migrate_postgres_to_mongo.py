"""One-time PostgreSQL -> MongoDB migration utility.

Usage:
  pip install -r requirements-migration.txt
  POSTGRES_URL=postgresql://... MONGODB_URL=mongodb://... MONGODB_DB=nusa_ai \
    python migrate_postgres_to_mongo.py

The script preserves application IDs and copies each relational table to the
collection used by the MongoDB adapter. It is intentionally explicit so the
operator can review the source and target before a production cutover.
"""
import asyncio
import os
from datetime import date, datetime

import asyncpg
from motor.motor_asyncio import AsyncIOMotorClient

TABLES = {
    "users": "users",
    "households": "households",
    "residents": "residents",
    "reports": "reports",
    "report_ai_analysis": "reportaianalysises",
    "report_status_events": "reportstatusevents",
    "notifications": "notifications",
    "finance_transactions": "financetransactions",
    "announcements": "announcements",
    "activities": "activities",
    "community_metrics": "communitymetrics",
    "ai_conversations": "aiconversations",
}


def normalize(value):
    if isinstance(value, (datetime, date)):
        return value if isinstance(value, datetime) else datetime.combine(value, datetime.min.time())
    if isinstance(value, dict):
        return {key: normalize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return value


async def migrate():
    postgres_url = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")
    if not postgres_url:
        raise RuntimeError("Set POSTGRES_URL (or DATABASE_URL) to the source PostgreSQL database")
    mongo_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    mongo_db = os.environ.get("MONGODB_DB", "nusa_ai")
    source = await asyncpg.connect(postgres_url.replace("postgresql+asyncpg://", "postgresql://"))
    client = AsyncIOMotorClient(mongo_url)
    target = client[mongo_db]
    try:
        for table, collection_name in TABLES.items():
            rows = await source.fetch(f'SELECT * FROM "{table}"')
            documents = [normalize(dict(row)) for row in rows]
            if not documents:
                print(f"{table}: 0 rows")
                continue
            collection = target[collection_name]
            await collection.delete_many({})
            await collection.insert_many(documents, ordered=False)
            print(f"{table}: {len(documents)} rows -> {collection_name}")
    finally:
        await source.close()
        client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
