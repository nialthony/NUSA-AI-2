from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import Base, engine, get_db, SessionLocal
from models import (User, Resident, Household, Report, ReportAIAnalysis, FinanceTransaction,
                    Announcement, Activity, AIConversation)
from auth import hash_password, verify_password, create_access_token, get_current_user, require_roles
import analytics
import ai_service
import storage
from seed import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nusa")

app = FastAPI(title="NUSA API")
api = APIRouter(prefix="/api")

MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


# ---------- schemas ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone: str = ""


class TxIn(BaseModel):
    description: str = Field(min_length=3, max_length=160)
    category: str
    type: str
    amount: float = Field(gt=0)
    date: Optional[datetime] = None


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    body: str = Field(min_length=5)
    category: str = "Umum"
    pinned: bool = False


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)
    session_id: Optional[str] = None


class StatusIn(BaseModel):
    status: str


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "phone": u.phone}


def report_out(r: Report) -> dict:
    a = r.analysis
    return {
        "id": r.id, "title": r.title, "description": r.description, "category": r.category,
        "severity": r.severity, "status": r.status, "rt": r.rt, "rw": r.rw, "location": r.location,
        "image_path": r.image_path, "reporter_name": r.reporter_name,
        "created_at": r.created_at.isoformat(),
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
        "analysis": None if not a else {
            "category": a.category, "issue": a.issue, "severity": a.severity,
            "confidence": a.confidence, "summary": a.summary,
            "recommended_action": a.recommended_action, "provider": a.provider,
        },
    }


# ---------- auth ----------
@api.post("/auth/login")
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    token = create_access_token(user)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        max_age=604800, path="/")
    return {"access_token": token, "user": user_out(user)}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user_out(user)


@api.post("/auth/logout")
async def logout(response: Response, user: User = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/config")
async def config():
    return {"ai_provider": ai_service.provider_mode(), "community": "RT 09 / RW 04", "village": "Desa Sukamaju"}


# ---------- analytics ----------
@api.get("/analytics/overview")
async def get_overview(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await analytics.overview(db)


@api.get("/analytics/pulse")
async def get_pulse(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await analytics.compute_pulse(db)


@api.get("/analytics/reports")
async def get_report_analytics(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await analytics.report_analytics(db)


@api.get("/analytics/insights")
async def get_insights(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await analytics.insights(db)


@api.get("/public/stats")
async def public_stats(db: AsyncSession = Depends(get_db)):
    ov = await analytics.overview(db)
    return {"residents": ov["residents"], "households": ov["households"],
            "open_reports": ov["reports_open"], "pulse": ov["pulse"]}


# ---------- reports ----------
@api.get("/reports")
async def list_reports(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
                       mine: bool = False, category: Optional[str] = None, severity: Optional[str] = None,
                       status: Optional[str] = None, rt: Optional[str] = None, q: Optional[str] = None,
                       limit: int = Query(200, le=500)):
    stmt = select(Report).options(selectinload(Report.analysis)).order_by(desc(Report.created_at)).limit(limit)
    if mine or user.role == "resident":
        stmt = stmt.where(Report.reporter_id == user.id)
    if category:
        stmt = stmt.where(Report.category == category)
    if severity:
        stmt = stmt.where(Report.severity == severity)
    if status:
        stmt = stmt.where(Report.status == status)
    if rt:
        stmt = stmt.where(Report.rt == rt)
    rows = (await db.execute(stmt)).scalars().all()
    if q:
        rows = [r for r in rows if q.lower() in r.title.lower() or q.lower() in r.description.lower()]
    return [report_out(r) for r in rows]


@api.get("/reports/all")
async def list_all_reports(db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("admin", "superadmin")),
                           category: Optional[str] = None, severity: Optional[str] = None,
                           status: Optional[str] = None, rt: Optional[str] = None, q: Optional[str] = None):
    stmt = select(Report).options(selectinload(Report.analysis)).order_by(desc(Report.created_at))
    for col, val in ((Report.category, category), (Report.severity, severity), (Report.status, status), (Report.rt, rt)):
        if val:
            stmt = stmt.where(col == val)
    rows = (await db.execute(stmt)).scalars().all()
    if q:
        rows = [r for r in rows if q.lower() in r.title.lower()]
    return [report_out(r) for r in rows]


@api.post("/reports/analyze")
async def analyze(file: UploadFile = File(...), category: Optional[str] = Form(None),
                  description: str = Form(""), user: User = Depends(get_current_user)):
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    if ext not in MIME:
        raise HTTPException(status_code=400, detail="Format gambar harus JPG, PNG, atau WEBP")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran gambar maksimal 8MB")
    result = await ai_service.analyze_image(data, MIME[ext], category, description)
    path = f"storage.nusa/reports/{user.id}/{uuid.uuid4()}.{ext}"
    try:
        stored = storage.put_object(f"nusa/reports/{user.id}/{uuid.uuid4()}.{ext}", data, MIME[ext])
        path = stored["path"]
    except Exception as e:
        logger.warning(f"Upload storage gagal: {e}")
        path = ""
    result["image_path"] = path
    return result


@api.post("/reports")
async def create_report(payload: dict, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    title = (payload.get("title") or payload.get("issue") or "Laporan Warga").strip()[:140]
    category = payload.get("category") or "Lainnya"
    severity = str(payload.get("severity") or "MEDIUM").upper()
    rt = str(payload.get("rt") or "09")
    rep = Report(title=title, description=(payload.get("description") or "")[:2000], category=category,
                 severity=severity, status="Terkirim", rt=rt, rw="04",
                 location=payload.get("location") or f"RT {rt} / RW 04",
                 image_path=payload.get("image_path") or "", reporter_id=user.id, reporter_name=user.name)
    db.add(rep)
    await db.flush()
    a = payload.get("analysis") or {}
    if a:
        db.add(ReportAIAnalysis(report_id=rep.id, category=a.get("category", category),
                                issue=a.get("issue", title), severity=a.get("severity", severity),
                                confidence=float(a.get("confidence", 0.8)), summary=a.get("summary", ""),
                                recommended_action=a.get("recommended_action", ""),
                                provider=a.get("provider", "mock")))
    await db.commit()
    r = (await db.execute(select(Report).options(selectinload(Report.analysis)).where(Report.id == rep.id))).scalar_one()
    return report_out(r)


@api.patch("/reports/{report_id}/status")
async def update_status(report_id: str, payload: StatusIn, db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_roles("admin", "superadmin"))):
    valid = ["Terkirim", "Ditinjau", "Ditangani", "Selesai", "Ditolak"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status harus salah satu dari {valid}")
    r = (await db.execute(select(Report).options(selectinload(Report.analysis)).where(Report.id == report_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    r.status = payload.status
    r.resolved_at = datetime.now(timezone.utc) if payload.status == "Selesai" else None
    await db.commit()
    return report_out(r)


@api.get("/files/{path:path}")
async def get_file(path: str):
    try:
        data, ct = storage.get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Berkas tidak ditemukan")
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})


# ---------- residents ----------
@api.get("/residents")
async def list_residents(db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("admin", "superadmin")),
                         q: Optional[str] = None, rt: Optional[str] = None):
    stmt = select(Resident).options(selectinload(Resident.household)).order_by(Resident.name)
    if rt:
        stmt = stmt.where(Resident.rt == rt)
    rows = (await db.execute(stmt)).scalars().all()
    if q:
        rows = [r for r in rows if q.lower() in r.name.lower()]
    return [{"id": r.id, "name": r.name, "rt": r.rt, "rw": r.rw, "phone": r.phone, "status": r.status,
             "role_label": r.role_label, "household": r.household.code if r.household else "-",
             "address": r.household.address if r.household else "-",
             "last_activity": r.last_activity.isoformat()} for r in rows]


@api.get("/households")
async def list_households(db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("admin", "superadmin"))):
    rows = (await db.execute(select(Household).options(selectinload(Household.residents)).order_by(Household.code))).scalars().all()
    return [{"id": h.id, "code": h.code, "head_name": h.head_name, "address": h.address, "rt": h.rt,
             "rw": h.rw, "members_count": h.members_count, "residents": [r.name for r in h.residents]} for h in rows]


# ---------- finance ----------
@api.get("/finance")
async def list_finance(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
                       type: Optional[str] = None, category: Optional[str] = None):
    stmt = select(FinanceTransaction).order_by(desc(FinanceTransaction.date))
    if type:
        stmt = stmt.where(FinanceTransaction.type == type)
    if category:
        stmt = stmt.where(FinanceTransaction.category == category)
    rows = (await db.execute(stmt)).scalars().all()
    ov = await analytics.overview(db)
    return {
        "summary": {"balance": ov["balance"], "monthly_income": ov["monthly_income"],
                    "monthly_expense": ov["monthly_expense"], "transparency_score": ov["transparency_score"]},
        "transactions": [{"id": t.id, "date": t.date.isoformat(), "description": t.description,
                          "category": t.category, "type": t.type, "amount": t.amount,
                          "receipt_path": t.receipt_path, "created_by": t.created_by} for t in rows],
    }


@api.post("/finance")
async def create_tx(payload: TxIn, db: AsyncSession = Depends(get_db),
                    user: User = Depends(require_roles("admin", "superadmin"))):
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Tipe harus income atau expense")
    t = FinanceTransaction(description=payload.description, category=payload.category, type=payload.type,
                           amount=payload.amount, date=payload.date or datetime.now(timezone.utc),
                           created_by=user.name)
    db.add(t)
    await db.commit()
    return {"id": t.id, "date": t.date.isoformat(), "description": t.description, "category": t.category,
            "type": t.type, "amount": t.amount, "created_by": t.created_by, "receipt_path": ""}


@api.get("/finance/monthly")
async def finance_monthly(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(FinanceTransaction))).scalars().all()
    buckets: dict[str, dict] = {}
    for t in rows:
        k = t.date.strftime("%Y-%m")
        b = buckets.setdefault(k, {"month": k, "income": 0, "expense": 0})
        b["income" if t.type == "income" else "expense"] += t.amount
    return sorted(buckets.values(), key=lambda b: b["month"])[-6:]


# ---------- announcements & activities ----------
@api.get("/announcements")
async def list_announcements(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Announcement).order_by(desc(Announcement.pinned), desc(Announcement.created_at)))).scalars().all()
    return [{"id": a.id, "title": a.title, "body": a.body, "category": a.category, "pinned": a.pinned,
             "created_by": a.created_by, "created_at": a.created_at.isoformat()} for a in rows]


@api.post("/announcements")
async def create_announcement(payload: AnnouncementIn, db: AsyncSession = Depends(get_db),
                              user: User = Depends(require_roles("admin", "superadmin"))):
    a = Announcement(title=payload.title, body=payload.body, category=payload.category,
                     pinned=payload.pinned, created_by=user.name)
    db.add(a)
    await db.commit()
    return {"id": a.id, "title": a.title, "body": a.body, "category": a.category, "pinned": a.pinned,
            "created_by": a.created_by, "created_at": a.created_at.isoformat()}


@api.get("/activities")
async def list_activities(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Activity).order_by(desc(Activity.date)))).scalars().all()
    return [{"id": a.id, "name": a.name, "type": a.type, "date": a.date.isoformat(), "location": a.location,
             "participants": a.participants, "target_participants": a.target_participants,
             "notes": a.notes} for a in rows]


# ---------- AI ----------
@api.post("/ai/ask")
async def ai_ask(payload: AskIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    ctx = await analytics.build_context(db)
    session_id = payload.session_id or f"nusa-{user.id}"
    result = await ai_service.ask(payload.question, ctx, session_id)
    db.add(AIConversation(user_id=user.id, session_id=session_id, role="user", content=payload.question))
    db.add(AIConversation(user_id=user.id, session_id=session_id, role="assistant",
                          content=result["answer"], sources=", ".join(result["sources"])))
    await db.commit()
    return {**result, "session_id": session_id, "ai_provider": ai_service.provider_mode()}


@api.get("/ai/history")
async def ai_history(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
                     session_id: Optional[str] = None):
    sid = session_id or f"nusa-{user.id}"
    rows = (await db.execute(select(AIConversation).where(AIConversation.session_id == sid)
                             .order_by(AIConversation.created_at).limit(50))).scalars().all()
    return [{"role": r.role, "content": r.content, "sources": r.sources.split(", ") if r.sources else [],
             "created_at": r.created_at.isoformat()} for r in rows]


@api.post("/ai/monthly-report")
async def ai_monthly(db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("admin", "superadmin"))):
    ctx = await analytics.build_context(db)
    report = await ai_service.monthly_report(ctx)
    return {**report, "generated_at": datetime.now(timezone.utc).isoformat(),
            "metrics": ctx["overview"], "period": datetime.now(timezone.utc).strftime("%B %Y"),
            "ai_provider": ai_service.provider_mode()}


# ---------- superadmin ----------
@api.get("/superadmin/overview")
async def super_overview(db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("superadmin"))):
    ov = await analytics.overview(db)
    users = (await db.execute(select(User))).scalars().all()
    convs = (await db.execute(select(AIConversation))).scalars().all()
    return {
        "communities": [{"name": "RT 09 / RW 04", "village": "Desa Sukamaju", "status": "Aktif",
                         "pulse": ov["pulse"], "residents": ov["residents"], "reports": ov["reports_total"]},
                        {"name": "RT 03 / RW 02", "village": "Desa Sukamaju", "status": "Menunggu Aktivasi",
                         "pulse": 0, "residents": 0, "reports": 0}],
        "users": [{"id": u.id, "email": u.email, "name": u.name, "role": u.role} for u in users],
        "ai_provider": ai_service.provider_mode(),
        "ai_queries": len([c for c in convs if c.role == "user"]),
        "platform": {"database": "PostgreSQL", "storage": "Emergent Object Storage", "version": "MVP 1.0"},
    }


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        await seed(db)
    try:
        storage.init_storage()
        logger.info("Object storage siap")
    except Exception as e:
        logger.warning(f"Storage init gagal: {e}")
    logger.info(f"NUSA siap. AI provider: {ai_service.provider_mode()}")
