import os
from contextlib import asynccontextmanager
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.environ.get("MONGODB_URL", os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
MONGODB_DB = os.environ.get("MONGODB_DB", "nusa_ai")
_client = AsyncIOMotorClient(MONGODB_URL)
_database = _client[MONGODB_DB]


class Predicate:
    def __init__(self, field, operator, value):
        self.field, self.operator, self.value = field, operator, value

    def matches(self, document):
        return self.operator == "eq" and document.get(self.field) == self.value


class Sort:
    def __init__(self, field, reverse=False):
        self.field, self.reverse = field, reverse


class Query:
    def __init__(self, model):
        self.model = model
        self.predicates = []
        self.sort = None
        self.max_items = None

    def where(self, *conditions):
        self.predicates.extend(c for c in conditions if c is not None)
        return self

    def options(self, *_args):
        return self

    def order_by(self, *sorts):
        self.sort = list(sorts)
        return self

    def limit(self, amount):
        self.max_items = amount
        return self

    def execution_options(self, **_kwargs):
        return self


class Result:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return self

    def all(self):
        return self.values

    def scalar_one_or_none(self):
        if len(self.values) > 1:
            raise RuntimeError("Expected at most one result")
        return self.values[0] if self.values else None

    def scalar_one(self):
        if len(self.values) != 1:
            raise RuntimeError(f"Expected one result, got {len(self.values)}")
        return self.values[0]


def select(model):
    return Query(model)


def desc(field):
    return Sort(field.name, reverse=True)


def selectinload(_field):
    return None


class MongoSession:
    def __init__(self, database):
        self.database = database
        self.pending = []
        self.tracked = []

    async def execute(self, query):
        collection = self.database[query.model.collection_name()]
        documents = [doc async for doc in collection.find({})]
        for predicate in query.predicates:
            documents = [doc for doc in documents if predicate.matches(doc)]
        if query.sort:
            for sort in reversed(query.sort):
                field = getattr(sort, "field", getattr(sort, "name", None))
                reverse = getattr(sort, "reverse", False)
                documents.sort(key=lambda d: d.get(field), reverse=reverse)
        if query.max_items is not None:
            documents = documents[:query.max_items]
        values = [query.model.from_document(doc) for doc in documents]
        for value in values:
            await self._hydrate(value)
        self.tracked.extend(values)
        return Result(values)

    async def _hydrate(self, value):
        name = value.__class__.__name__
        if name == "Report":
            from models import ReportAIAnalysis, ReportStatusEvent
            analyses = [doc async for doc in self.database[ReportAIAnalysis.collection_name()].find({"report_id": value.id})]
            events = [doc async for doc in self.database[ReportStatusEvent.collection_name()].find({"report_id": value.id})]
            value.analysis = ReportAIAnalysis.from_document(analyses[0]) if analyses else None
            value.events = [ReportStatusEvent.from_document(doc) for doc in events]
            value.events.sort(key=lambda event: event.created_at or datetime.min)
        elif name == "Resident":
            from models import Household
            doc = await self.database[Household.collection_name()].find_one({"id": value.household_id}) if value.household_id else None
            value.household = Household.from_document(doc) if doc else None
        elif name == "Household":
            from models import Resident
            docs = [doc async for doc in self.database[Resident.collection_name()].find({"household_id": value.id})]
            value.residents = [Resident.from_document(doc) for doc in docs]

    def add(self, value):
        self.pending.append(value)

    async def flush(self):
        for value in self.pending:
            value.ensure_id()

    async def commit(self):
        await self.flush()
        values = self.pending + self.tracked
        seen = set()
        for value in values:
            key = (value.__class__, value.id)
            if key in seen:
                continue
            seen.add(key)
            await self.database[value.collection_name()].replace_one(
                {"id": value.id}, value.to_document(), upsert=True
            )
        self.pending.clear()
        self.tracked.clear()

    async def rollback(self):
        self.pending.clear()
        self.tracked.clear()


@asynccontextmanager
async def session_context():
    session = MongoSession(_database)
    try:
        yield session
    finally:
        await session.rollback()


async def get_db():
    async with session_context() as session:
        yield session


async def init_db():
    await _database.command("ping")
    await _database.users.create_index("email", unique=True)
    await _database.reports.create_index([("created_at", -1)])
    await _database.notifications.create_index([("user_id", 1), ("created_at", -1)])


SessionLocal = session_context
engine = None
Base = object

def database():
    return _database
