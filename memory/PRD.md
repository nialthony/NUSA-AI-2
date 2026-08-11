# NUSA — AI Community Operating System (PRD)

## Problem Statement (original)
Production-quality MVP web app "NUSA — AI Community Operating System" for Indonesian RT/RW communities
(target: RT 09 / RW 04, Desa Sukamaju). Turns fragmented neighborhood information — citizen reports,
infrastructure problems, community finances, resident data, community activity — into actionable
intelligence. Roles: Resident, Community Admin, lightweight Super Admin. Premium modern SaaS UI
(Linear/Notion/Vercel-like), Bahasa Indonesia microcopy, mobile-first for residents.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), all routes under `/api`.
- Database: **PostgreSQL** via SQLAlchemy async (`db.py`, `models.py`), managed by supervisor
  (`/etc/supervisor/conf.d/postgres.conf`). Tables: users, households, residents, reports,
  report_ai_analysis, finance_transactions, announcements, activities, community_metrics, ai_conversations.
- Auth: JWT (Bearer + httpOnly cookie), bcrypt, roles resident/admin/superadmin (`auth.py`).
- AI: provider abstraction in `ai_service.py` — `AI_PROVIDER=external` (Emergent LLM key,
  gemini-3-flash-preview) with automatic deterministic **mock fallback** ("AI Demo Mode" chip).
- Analytics service `analytics.py`: transparent Community Pulse formula (infrastructure, safety,
  cleanliness, finance transparency, engagement → normalized 0–100), insights, report analytics.
- Storage: Emergent object storage for report photos (`storage.py`), served via `GET /api/files/{path}`.
- Frontend: React 19 + react-router + Tailwind + recharts + sonner, lazy-loaded routes, `@/` alias.

## User Personas
1. **Warga (Resident)** — mobile user, reports problems with photos, checks kas warga & announcements.
2. **Admin RT (Community Admin)** — Command Center, triages reports, records kas, publishes announcements, generates monthly report.
3. **Super Admin** — platform-level view of communities, accounts, AI usage.

## Core Requirements (static)
Landing + about + login; resident portal (dashboard, smart report, my reports, finance, community, profile);
admin (command center, reports, residents, finance, analytics, AI, monthly report); superadmin;
Community Pulse; AI insights from real data; Ask NUSA; transparent finance; monthly AI report;
announcements; activities; RBAC; polished loading/empty/error states; mobile-first.

## Implemented (2026-06)
- Full seed demo data: 27 reports (6 months), 30 residents, 24 households, ~90 finance transactions,
  8 activities, 5 announcements, 6 monthly metric rows. Balance forced to **Rp 12.450.000**, Pulse 90 (SEHAT).
- Demo accounts working: resident@nusa.demo / admin@nusa.demo / superadmin@nusa.demo (demo123).
- Smart Report: camera/file upload → real Gemini vision analysis (category, issue, severity, confidence,
  summary, recommended action) → submit → appears for admin. Mock fallback verified.
- Admin report management with 5 filters + status transitions.
- Finance CRUD with correct balance math, 6-month income/expense chart, transparency score, Ask NUSA.
- Analytics: category pie, monthly area, severity bar, per-RT bar.
- Monthly AI report with all sections + print-to-PDF.
- Announcements creation → visible to residents.
- RBAC verified (resident blocked from /admin and /superadmin; admin blocked from /superadmin).
- Test suite: `/app/backend/tests/backend_test.py` (28 tests, all pass); E2E flows passed.

## Backlog
- P1: photo receipts for finance transactions; assign reports to pengurus; report detail page with timeline.
- P1: resident registration + household self-service; WhatsApp/notification push on status change.
- P2: multi-community (superadmin onboarding a second RT), real PDF export server-side, offline-first PWA,
  activity RSVP/participant records, streaming AI responses (SSE).

## Next Tasks
1. Report status timeline + notifications to the reporter.
2. Receipt upload on finance transactions for stronger transparency score.
3. Onboarding flow for a second RT under Super Admin.
