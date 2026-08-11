import os
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models import (User, Household, Resident, Report, ReportAIAnalysis, FinanceTransaction,
                    Announcement, Activity, CommunityMetric)
from auth import hash_password

random.seed(9)

NAMES = ["Budi Santoso", "Siti Rahma", "Andi Pratama", "Dewi Lestari", "Rizky Maulana", "Nurul Hidayah",
         "Agus Setiawan", "Ratna Sari", "Joko Susilo", "Ayu Wulandari", "Hendra Gunawan", "Maya Puspita",
         "Slamet Riyadi", "Indah Permata", "Bayu Nugroho", "Fitri Handayani", "Eko Prasetyo", "Lestari Wati",
         "Dimas Ardiansyah", "Sri Wahyuni", "Yusuf Hakim", "Rina Marlina", "Tono Wijaya", "Kartika Dewi",
         "Bambang Sutrisno", "Melati Anggraini", "Iwan Setiadi", "Putri Amelia", "Hasan Basri", "Wulan Sari"]

STREETS = ["Jl. Mawar", "Jl. Melati", "Jl. Kenanga", "Jl. Anggrek", "Jl. Cempaka", "Gang Sukamaju"]

REPORT_SEEDS = [
    ("Lampu jalan mati di depan pos ronda", "Penerangan", "Lampu Jalan Mati", "HIGH"),
    ("Saluran air tersumbat sampah", "Drainase", "Saluran Air Tersumbat", "HIGH"),
    ("Jalan berlubang di gang utama", "Infrastruktur", "Jalan Rusak", "HIGH"),
    ("Tumpukan sampah tidak diangkut", "Sampah", "Tumpukan Sampah", "MEDIUM"),
    ("Pagar taman bermain rusak", "Infrastruktur", "Fasilitas Rusak", "MEDIUM"),
    ("Motor asing berkeliling malam hari", "Keamanan", "Potensi Gangguan Keamanan", "MEDIUM"),
    ("Pohon tua berpotensi tumbang", "Lingkungan", "Kerusakan Lingkungan", "HIGH"),
    ("Genangan air setelah hujan", "Drainase", "Genangan Air", "MEDIUM"),
    ("Lampu PJU berkedip di ujung jalan", "Penerangan", "Lampu Jalan Bermasalah", "LOW"),
    ("Trotoar amblas dekat warung", "Infrastruktur", "Jalan Rusak", "MEDIUM"),
    ("Bak sampah rusak di TPS", "Sampah", "Fasilitas Sampah Rusak", "LOW"),
    ("CCTV pos ronda tidak berfungsi", "Keamanan", "Perangkat Keamanan Rusak", "MEDIUM"),
    ("Aspal terkelupas di tikungan", "Infrastruktur", "Jalan Rusak", "HIGH"),
    ("Sampah dibuang di sungai kecil", "Lingkungan", "Pencemaran Lingkungan", "MEDIUM"),
    ("Drainase mampet di RT 04", "Drainase", "Saluran Air Tersumbat", "HIGH"),
    ("Jalan gelap tanpa penerangan", "Penerangan", "Lampu Jalan Mati", "HIGH"),
    ("Sampah menumpuk depan balai RT", "Sampah", "Tumpukan Sampah", "MEDIUM"),
    ("Kabel listrik menjuntai rendah", "Keamanan", "Bahaya Kelistrikan", "HIGH"),
    ("Rumput liar menutupi jalan setapak", "Lingkungan", "Kerusakan Lingkungan", "LOW"),
    ("Lubang jalan membesar setelah hujan", "Infrastruktur", "Jalan Rusak", "HIGH"),
    ("Tutup gorong-gorong hilang", "Drainase", "Saluran Air Rusak", "HIGH"),
    ("Angkutan sampah terlambat 3 hari", "Sampah", "Layanan Sampah", "MEDIUM"),
    ("Portal gang tidak bisa ditutup", "Keamanan", "Fasilitas Keamanan Rusak", "LOW"),
    ("Papan informasi RT rusak", "Lainnya", "Perlu Peninjauan", "LOW"),
    ("Lampu taman mati semua", "Penerangan", "Lampu Jalan Mati", "MEDIUM"),
    ("Selokan bau menyengat", "Drainase", "Saluran Air Tersumbat", "MEDIUM"),
    ("Jembatan kecil retak", "Infrastruktur", "Fasilitas Rusak", "HIGH"),
]

STATUSES = ["Terkirim", "Ditinjau", "Ditangani", "Selesai"]

FIN_INCOME = [("Iuran Warga Bulanan", "Iuran Warga", 2500000), ("Iuran Keamanan", "Keamanan", 900000),
              ("Sumbangan Warga", "Lainnya", 500000), ("Iuran Kebersihan", "Kebersihan", 750000),
              ("Donasi Kegiatan", "Kegiatan", 400000)]
FIN_EXPENSE = [("Penggantian Lampu Jalan", "Infrastruktur", 350000), ("Honor Petugas Kebersihan", "Kebersihan", 600000),
               ("Honor Satpam", "Keamanan", 800000), ("Perbaikan Jalan Gang", "Infrastruktur", 1200000),
               ("Acara 17 Agustus", "Kegiatan", 500000), ("Listrik Balai RT", "Utilitas", 220000),
               ("Bantuan Sosial Warga", "Bantuan Sosial", 450000), ("Pengerukan Drainase", "Infrastruktur", 700000),
               ("Konsumsi Rapat Warga", "Kegiatan", 180000), ("Alat Kebersihan", "Kebersihan", 260000)]

ACTIVITIES = [("Gotong Royong Bersih Lingkungan", "Gotong Royong", 62, 80), ("Rapat RT Bulanan", "Rapat", 48, 55),
              ("Posyandu Balita", "Kesehatan", 71, 75), ("Ronda Malam Terpadu", "Keamanan", 36, 40),
              ("Persiapan 17 Agustus", "Kegiatan", 88, 90), ("Kerja Bakti Drainase", "Gotong Royong", 41, 60),
              ("Senam Sehat Warga", "Kesehatan", 54, 60), ("Pelatihan UMKM Warga", "Sosial", 27, 40)]

ANNOUNCEMENTS = [
    ("Kerja Bakti Minggu Pagi", "Seluruh warga diharapkan hadir pada kerja bakti hari Minggu pukul 07.00 di depan balai RT. Mohon membawa alat kebersihan masing-masing.", "Kegiatan", True),
    ("Rapat Warga Bulanan", "Rapat warga bulanan akan dilaksanakan Sabtu pukul 19.30 di balai RT 09 membahas laporan kas dan program bulan depan.", "Rapat", False),
    ("Persiapan 17 Agustus", "Panitia peringatan HUT RI membuka pendaftaran lomba untuk anak dan dewasa. Pendaftaran melalui pengurus RT hingga akhir bulan.", "Kegiatan", True),
    ("Jadwal Baru Pengangkutan Sampah", "Mulai pekan depan pengangkutan sampah dilakukan setiap Senin, Rabu, dan Jumat pagi.", "Pengumuman", False),
    ("Pembayaran Iuran Warga", "Iuran warga bulan ini dapat dibayarkan kepada bendahara RT atau melalui transfer. Bukti pembayaran akan dicatat di sistem NUSA.", "Keuangan", False),
]


async def seed(db: AsyncSession):
    demo_pw = hash_password(os.environ.get("DEMO_PASSWORD", "demo123"))
    accounts = [
        ("resident@nusa.demo", "Budi Santoso", "resident", "0812-3456-7890"),
        ("admin@nusa.demo", "Pak Hendra Gunawan", "admin", "0813-2211-9087"),
        ("superadmin@nusa.demo", "Pengelola NUSA", "superadmin", "0811-9000-1234"),
    ]
    for email, name, role, phone in accounts:
        u = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if u is None:
            db.add(User(email=email, password_hash=demo_pw, name=name, role=role, phone=phone))
        else:
            u.password_hash = demo_pw
            u.name, u.role, u.phone = name, role, phone
    await db.commit()

    if (await db.execute(select(func.count(Report.id)))).scalar() or 0:
        return

    now = datetime.now(timezone.utc)
    households, residents = [], []
    for i in range(24):
        rt = ["09", "04", "07", "11"][i % 4]
        h = Household(code=f"KK-{1000 + i}", head_name=NAMES[i % len(NAMES)],
                      address=f"{STREETS[i % len(STREETS)]} No. {i + 1}", rt=rt, rw="04",
                      members_count=random.randint(2, 6))
        households.append(h)
        db.add(h)
    await db.flush()

    resident_user = (await db.execute(select(User).where(User.email == "resident@nusa.demo"))).scalar_one()
    for i, name in enumerate(NAMES):
        h = households[i % len(households)]
        r = Resident(name=name, rt=h.rt, rw="04", household_id=h.id,
                     phone=f"0812-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
                     status=random.choice(["Aktif", "Aktif", "Aktif", "Pindah"]),
                     role_label="Ketua RT" if i == 6 else ("Bendahara" if i == 1 else "Warga"),
                     last_activity=now - timedelta(days=random.randint(0, 20)),
                     user_id=resident_user.id if name == "Budi Santoso" else None)
        residents.append(r)
        db.add(r)

    for i, (title, cat, issue, sev) in enumerate(REPORT_SEEDS):
        age = int(i * 5.5) + random.randint(0, 4)
        created = now - timedelta(days=age)
        if age < 8:
            status = "Terkirim" if i % 2 == 0 else "Ditinjau"
        elif age < 25:
            status = "Ditangani" if i % 3 else "Ditinjau"
        else:
            status = "Selesai" if i % 5 else "Ditangani"
        rt = ["09", "04", "07", "11"][i % 4] if cat != "Drainase" else ("04" if i % 2 == 0 else "09")
        rep = Report(title=title, description=f"{title}. Dilaporkan warga di {STREETS[i % len(STREETS)]}, RT {rt}.",
                     category=cat, severity=sev, status=status, rt=rt, rw="04",
                     location=f"{STREETS[i % len(STREETS)]}, RT {rt} / RW 04", created_at=created,
                     reporter_name=NAMES[i % len(NAMES)],
                     reporter_id=resident_user.id if i % 4 == 0 else None,
                     resolved_at=created + timedelta(days=6) if status == "Selesai" else None)
        db.add(rep)
        await db.flush()
        db.add(ReportAIAnalysis(report_id=rep.id, category=cat, issue=issue, severity=sev,
                                confidence=round(random.uniform(0.79, 0.96), 2),
                                summary=f"AI mendeteksi indikasi {issue.lower()} pada foto laporan warga di RT {rt}. Kondisi ini berpotensi mengganggu kenyamanan dan keselamatan warga.",
                                recommended_action=f"Lakukan inspeksi lapangan terkait {issue.lower()} dan tentukan prioritas perbaikan.",
                                provider="mock", created_at=created))

    for m in range(6, -1, -1):
        base = now - timedelta(days=30 * m)
        for desc, cat, amt in FIN_INCOME:
            if m == 0 and cat in ("Lainnya",):
                continue
            db.add(FinanceTransaction(date=base.replace(day=min(5 + random.randint(0, 10), 28)), description=desc,
                                      category=cat, type="income", amount=amt + random.randint(-100, 300) * 1000,
                                      created_by="Bendahara RT", receipt_path=""))
        for desc, cat, amt in FIN_EXPENSE:
            if m > 0 and random.random() < 0.3:
                continue
            db.add(FinanceTransaction(date=base.replace(day=min(8 + random.randint(0, 15), 28)), description=desc,
                                      category=cat, type="expense", amount=amt + random.randint(-50, 200) * 1000,
                                      created_by="Bendahara RT", receipt_path=""))

    for i, (name, typ, part, target) in enumerate(ACTIVITIES):
        db.add(Activity(name=name, type=typ, date=now - timedelta(days=i * 11),
                        location=f"Balai RT 09" if i % 2 == 0 else "Lapangan Sukamaju",
                        participants=part, target_participants=target,
                        notes=f"Kegiatan {name.lower()} diikuti {part} warga RT 09 / RW 04."))

    for i, (title, body, cat, pinned) in enumerate(ANNOUNCEMENTS):
        db.add(Announcement(title=title, body=body, category=cat, pinned=pinned,
                            created_at=now - timedelta(days=i * 4), created_by="Admin RT 09"))

    await db.flush()
    all_tx = (await db.execute(select(FinanceTransaction))).scalars().all()
    balance = sum(t.amount if t.type == "income" else -t.amount for t in all_tx)
    opening = 12450000 - balance
    if opening > 0:
        db.add(FinanceTransaction(date=now - timedelta(days=200), description="Saldo awal kas warga (hasil audit periode sebelumnya)",
                                  category="Iuran Warga", type="income", amount=opening, created_by="Bendahara RT"))

    metrics = [(74, 88, 79, 90, 80), (70, 90, 76, 91, 82), (76, 89, 84, 92, 85),
               (79, 92, 80, 93, 86), (72, 91, 83, 94, 88), (74, 91, 82, 94, 88)]
    for idx, (inf, saf, cle, fin, eng) in enumerate(metrics):
        month = (now - timedelta(days=30 * (6 - idx))).strftime("%Y-%m")
        db.add(CommunityMetric(month=month, infrastructure=inf, safety=saf, cleanliness=cle,
                               finance=fin, engagement=eng, pulse=round((inf + saf + cle + fin + eng) / 5)))
    await db.commit()
