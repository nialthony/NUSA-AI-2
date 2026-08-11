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
- P1: assign reports to pengurus; report detail page; export kas ke Excel/CSV.
- P1: resident registration + household self-service; WhatsApp/notification push on status change.
- P2: multi-community (superadmin onboarding a second RT), real PDF export server-side, offline-first PWA,
  activity RSVP/participant records, streaming AI responses (SSE), pagination for notifications.

## Iteration 2 — Riwayat Status, Bukti Transaksi, Peta Titik Masalah (2026-06)
- **Riwayat Status Laporan**: tabel `report_status_events` + `notifications`. Setiap perubahan status
  (`PATCH /api/reports/{id}/status`, body `{"status","note"}`) menambah event ber-timestamp dan mengirim
  notifikasi ke pelapor. Status yang sama ditolak (400). Timeline tampil di `/resident/reports` dan
  `/admin/reports` (komponen `StatusTimeline.jsx`); bel notifikasi + badge belum dibaca di layout warga
  (`GET /api/notifications`, `POST /api/notifications/read`).
- **Bukti Transaksi**: `POST /api/finance/{tx_id}/receipt` (multipart, admin saja, JPG/PNG/WEBP/PDF ≤8MB,
  disimpan di object storage). Kolom "Bukti" di `/admin/finance` untuk unggah/lihat, dan tautan
  "Lihat bukti" untuk warga di `/resident/finance`.
- **Peta Titik Masalah**: kolom `lat`/`lng` pada laporan (koordinat per RT), `GET /api/reports/map`
  (points + hotspots per RT + center, admin saja). Peta Leaflet/OpenStreetMap di `/admin/analytics`
  dengan marker berwarna per severity, filter tingkat & "hanya belum selesai", serta kartu titik rawan
  per RT yang memfokuskan peta.
- Diuji: 12 tes backend baru (`/app/backend/tests/test_new_features.py`) semuanya lulus + E2E desktop/mobile
  tanpa error konsol.

## Iteration 3 — Logo NUSA & Dark Mode (2026-06)
- Logo resmi NUSA dipasang sebagai favicon (`favicon.ico`, `apple-touch-icon.png`), ikon PWA, dan
  logo aplikasi (`components/Logo.jsx`) di landing, /about, login, layout warga, sidebar admin, dan Super Admin.
  Latar putih logo dibuat transparan agar tampil baik di tema terang & gelap. Judul halaman: "NUSA — AI Community Operating System".
- Dark mode: `context/ThemeContext.jsx` (kelas `dark` di `<html>`, tersimpan di localStorage, ikut `color-scheme`),
  tombol `ThemeToggle` (data-testid `theme-toggle`) di semua header/sidebar. Palet gelap didefinisikan
  di `index.css` (permukaan #080D18/#0F172A, border #22304A, aksen emerald tetap), termasuk penyesuaian
  input, tabel, kartu wawasan, dan peta Leaflet (tile diredupkan + popup gelap).

## Next Tasks
1. Tugaskan laporan ke pengurus tertentu + SLA penanganan.
2. Ekspor buku kas (CSV/Excel) untuk audit rapat warga.
3. Notifikasi WhatsApp (ditunda oleh pengguna — perlu pilihan penyedia & kredensial).

