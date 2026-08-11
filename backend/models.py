import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db import Base


def uid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="resident")
    phone: Mapped[str] = mapped_column(String, default="")
    avatar_url: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    resident: Mapped["Resident"] = relationship(back_populates="user", uselist=False)


class Household(Base):
    __tablename__ = "households"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    code: Mapped[str] = mapped_column(String, unique=True)
    head_name: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    rt: Mapped[str] = mapped_column(String)
    rw: Mapped[str] = mapped_column(String)
    members_count: Mapped[int] = mapped_column(Integer, default=1)
    residents: Mapped[list["Resident"]] = relationship(back_populates="household")


class Resident(Base):
    __tablename__ = "residents"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    household_id: Mapped[str | None] = mapped_column(ForeignKey("households.id"), nullable=True)
    name: Mapped[str] = mapped_column(String)
    rt: Mapped[str] = mapped_column(String)
    rw: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="Aktif")
    role_label: Mapped[str] = mapped_column(String, default="Warga")
    last_activity: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    user: Mapped["User"] = relationship(back_populates="resident")
    household: Mapped["Household"] = relationship(back_populates="residents")


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    reporter_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reporter_name: Mapped[str] = mapped_column(String, default="Warga")
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String, default="MEDIUM")
    status: Mapped[str] = mapped_column(String, default="Terkirim")
    rt: Mapped[str] = mapped_column(String, default="09")
    rw: Mapped[str] = mapped_column(String, default="04")
    location: Mapped[str] = mapped_column(String, default="RT 09 / RW 04")
    image_path: Mapped[str] = mapped_column(String, default="")
    lat: Mapped[float] = mapped_column(Float, default=-6.9175)
    lng: Mapped[float] = mapped_column(Float, default=107.6191)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    analysis: Mapped["ReportAIAnalysis"] = relationship(back_populates="report", uselist=False)
    events: Mapped[list["ReportStatusEvent"]] = relationship(
        back_populates="report", order_by="ReportStatusEvent.created_at")


class ReportStatusEvent(Base):
    __tablename__ = "report_status_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"))
    from_status: Mapped[str] = mapped_column(String, default="")
    to_status: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(Text, default="")
    changed_by: Mapped[str] = mapped_column(String, default="Sistem NUSA")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    report: Mapped["Report"] = relationship(back_populates="events")


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    report_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text, default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ReportAIAnalysis(Base):
    __tablename__ = "report_ai_analysis"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"))
    category: Mapped[str] = mapped_column(String)
    issue: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    summary: Mapped[str] = mapped_column(Text, default="")
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String, default="mock")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    report: Mapped["Report"] = relationship(back_populates="analysis")


class FinanceTransaction(Base):
    __tablename__ = "finance_transactions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    description: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # income | expense
    amount: Mapped[float] = mapped_column(Float)
    receipt_path: Mapped[str] = mapped_column(String, default="")
    created_by: Mapped[str] = mapped_column(String, default="Admin RT")


class Announcement(Base):
    __tablename__ = "announcements"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String, default="Umum")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String, default="Admin RT")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="Sosial")
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    location: Mapped[str] = mapped_column(String, default="Balai RT 09")
    participants: Mapped[int] = mapped_column(Integer, default=0)
    target_participants: Mapped[int] = mapped_column(Integer, default=50)
    notes: Mapped[str] = mapped_column(Text, default="")


class CommunityMetric(Base):
    __tablename__ = "community_metrics"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    month: Mapped[str] = mapped_column(String)  # YYYY-MM
    infrastructure: Mapped[int] = mapped_column(Integer)
    safety: Mapped[int] = mapped_column(Integer)
    cleanliness: Mapped[int] = mapped_column(Integer)
    finance: Mapped[int] = mapped_column(Integer)
    engagement: Mapped[int] = mapped_column(Integer)
    pulse: Mapped[int] = mapped_column(Integer)


class AIConversation(Base):
    __tablename__ = "ai_conversations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    session_id: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    sources: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
