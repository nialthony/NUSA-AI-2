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
from db import select, desc, selectinload, get_db, SessionLocal, init_db, MongoSession as AsyncSession
from models import (User, Resident, Household, Report, ReportAIAnalysis, FinanceTransaction,
                    Announcement, Activity, AIConversation, ReportStatusEvent, Notification)
from auth import hash_password, verify_password, create_access_token, get_current_user, require_roles
import analytics
import ai_service
import storage
from seed import seed, RT_COORD

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
    note: Optional[str] = Field(default=None, max_length=400)


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "phone": u.phone}


def report_out(r: Report) -> dict:
    a = r.analysis
    return {
        "id": r.id, "title": r.title, "description": r.description, "category": r.category,
        "severity": r.severity, "status": r.status, "rt": r.rt, "rw": r.rw, "location": r.location,
        "image_path": r.image_path, "reporter_name": r.reporter_name,
        "lat": r.lat, "lng": r.lng,
        "created_at": r.created_at.isoformat(),
        "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
        "timeline": [{"from_status": e.from_status, "to_status": e.to_status, "note": e.note,
                      "changed_by": e.changed_by, "created_at": e.created_at.isoformat()}
                     for e in (r.events or [])],
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
REPORT_LOAD = (selectinload(Report.analysis), selectinload(Report.events))


@api.get("/reports")
async def list_reports(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
                       mine: bool = False, category: Optional[str] = None, severity: Optional[str] = None,
                       status: Optional[str] = None, rt: Optional[str] = None, q: Optional[str] = None,
                       limit: int = Query(200, le=500)):
    stmt = select(Report).options(*REPORT_LOAD).order_by(desc(Report.created_at)).limit(limit)
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
    stmt = select(Report).options(*REPORT_LOAD).order_by(desc(Report.created_at))
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
                 lat=float(payload.get("lat") or RT_COORD.get(rt, RT_COORD["09"])[0]),
                 lng=float(payload.get("lng") or RT_COORD.get(rt, RT_COORD["09"])[1]),
                 image_path=payload.get("image_path") or "", reporter_id=user.id, reporter_name=user.name)
    db.add(rep)
    await db.flush()
    db.add(ReportStatusEvent(report_id=rep.id, from_status="", to_status="Terkirim",
                             note="Laporan diterima sistem NUSA dan menunggu peninjauan pengurus.",
                             changed_by="Sistem NUSA"))
    a = payload.get("analysis") or {}
    if a:
        db.add(ReportAIAnalysis(report_id=rep.id, category=a.get("category", category),
                                issue=a.get("issue", title), severity=a.get("severity", severity),
                                confidence=float(a.get("confidence", 0.8)), summary=a.get("summary", ""),
                                recommended_action=a.get("recommended_action", ""),
                                provider=a.get("provider", "mock")))
    await db.commit()
    r = (await db.execute(select(Report).options(*REPORT_LOAD).where(Report.id == rep.id)
                          .execution_options(populate_existing=True))).scalar_one()
    return report_out(r)


@api.patch("/reports/{report_id}/status")
async def update_status(report_id: str, payload: StatusIn, db: AsyncSession = Depends(get_db),
                        user: User = Depends(require_roles("admin", "superadmin"))):
    valid = ["Terkirim", "Ditinjau", "Ditangani", "Selesai", "Ditolak"]
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status harus salah satu dari {valid}")
    r = (await db.execute(select(Report).options(*REPORT_LOAD).where(Report.id == report_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    if r.status == payload.status:
        raise HTTPException(status_code=400, detail=f"Laporan sudah berstatus {payload.status}")
    old = r.status
    default_note = {
        "Terkirim": "Laporan dikembalikan ke antrean peninjauan.",
        "Ditinjau": "Pengurus RT meninjau laporan dan memverifikasi kondisi lapangan.",
        "Ditangani": "Perbaikan sedang dikerjakan oleh petugas lingkungan.",
        "Selesai": "Masalah telah diselesaikan dan dikonfirmasi pengurus RT.",
        "Ditolak": "Laporan ditolak karena tidak memenuhi kriteria penanganan RT.",
    }[payload.status]
    r.status = payload.status
    r.resolved_at = datetime.now(timezone.utc) if payload.status == "Selesai" else None
    db.add(ReportStatusEvent(report_id=r.id, from_status=old, to_status=payload.status,
                             note=(payload.note or default_note)[:400], changed_by=user.name))
    if r.reporter_id:
        db.add(Notification(user_id=r.reporter_id, report_id=r.id,
                            title=f"Laporan Anda kini {payload.status.lower()}",
                            body=f"“{r.title}” diperbarui dari {old} menjadi {payload.status} oleh {user.name}."))
    await db.commit()
    r = (await db.execute(select(Report).options(*REPORT_LOAD).where(Report.id == report_id)
                          .execution_options(populate_existing=True))).scalar_one()
    return report_out(r)


@api.get("/reports/map")
async def reports_map(db: AsyncSession = Depends(get_db), user: User = Depends(require_roles("admin", "superadmin"))):
    rows = (await db.execute(select(Report).order_by(desc(Report.created_at)))).scalars().all()
    points = [{"id": r.id, "title": r.title, "category": r.category, "severity": r.severity,
               "status": r.status, "rt": r.rt, "lat": r.lat, "lng": r.lng,
               "created_at": r.created_at.isoformat()} for r in rows]
    hotspots: dict[str, dict] = {}
    for r in rows:
        h = hotspots.setdefault(r.rt, {"rt": r.rt, "total": 0, "urgent": 0, "open": 0,
                                       "lat": r.lat, "lng": r.lng})
        h["total"] += 1
        if r.severity == "HIGH":
            h["urgent"] += 1
        if r.status in ("Terkirim", "Ditinjau", "Ditangani"):
            h["open"] += 1
    return {"points": points, "hotspots": sorted(hotspots.values(), key=lambda h: -h["urgent"]),
            "center": {"lat": RT_COORD["09"][0], "lng": RT_COORD["09"][1]}}


@api.get("/notifications")
async def list_notifications(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Notification).where(Notification.user_id == user.id)
                             .order_by(desc(Notification.created_at)).limit(30))).scalars().all()
    return {"unread": sum(1 for n in rows if not n.read),
            "items": [{"id": n.id, "title": n.title, "body": n.body, "read": n.read,
                       "report_id": n.report_id, "created_at": n.created_at.isoformat()} for n in rows]}


@api.post("/notifications/read")
async def read_notifications(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (await db.execute(select(Notification).where(Notification.user_id == user.id,
                                                       Notification.read == False))).scalars().all()
    for n in rows:
        n.read = True
    await db.commit()
    return {"ok": True, "updated": len(rows)}


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


@api.post("/finance/{tx_id}/receipt")
async def upload_receipt(tx_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                         user: User = Depends(require_roles("admin", "superadmin"))):
    t = (await db.execute(select(FinanceTransaction).where(FinanceTransaction.id == tx_id))).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    ext = (file.filename or "bukti.jpg").rsplit(".", 1)[-1].lower()
    allowed = {**MIME, "pdf": "application/pdf"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Bukti harus berupa JPG, PNG, WEBP, atau PDF")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran bukti maksimal 8MB")
    try:
        stored = storage.put_object(f"nusa/receipts/{tx_id}/{uuid.uuid4()}.{ext}", data, allowed[ext])
    except Exception as e:
        logger.warning(f"Upload bukti gagal: {e}")
        raise HTTPException(status_code=502, detail="Penyimpanan bukti sedang tidak tersedia. Coba lagi.")
    t.receipt_path = stored["path"]
    await db.commit()
    return {"id": t.id, "receipt_path": t.receipt_path}


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
        "platform": {"database": "MongoDB", "storage": "Emergent Object Storage", "version": "MVP 1.0"},
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
    await init_db()
    async with SessionLocal() as db:
        await seed(db)
    try:
        storage.init_storage()
        logger.info("Object storage siap")
    except Exception as e:
        logger.warning(f"Storage init gagal: {e}")
    logger.info(f"NUSA siap. AI provider: {ai_service.provider_mode()}")
