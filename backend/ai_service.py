"""Abstraksi provider AI: mock (deterministik) & external (Emergent LLM key)."""
import os
import json
import base64
import hashlib
import logging
import uuid

logger = logging.getLogger(__name__)

CATEGORIES = ["Infrastruktur", "Sampah", "Penerangan", "Drainase", "Keamanan", "Lingkungan", "Lainnya"]

MOCK_TEMPLATES = {
    "Infrastruktur": ("Jalan Rusak", "HIGH",
                      "Terdeteksi kerusakan permukaan dan retakan pada badan jalan. Area terdampak berpotensi menimbulkan risiko keselamatan bagi pengendara motor dan pejalan kaki.",
                      "Lakukan inspeksi pada segmen jalan terdampak dan evaluasi apakah diperlukan perbaikan sementara atau pengaspalan ulang."),
    "Sampah": ("Tumpukan Sampah", "MEDIUM",
               "Terlihat tumpukan sampah yang tidak terangkut di area publik sehingga berpotensi menimbulkan bau dan sumber penyakit.",
               "Koordinasikan pengangkutan sampah tambahan dan pasang imbauan larangan membuang sampah di titik tersebut."),
    "Penerangan": ("Lampu Jalan Mati", "HIGH",
                   "Titik penerangan jalan umum tampak tidak berfungsi sehingga area menjadi gelap pada malam hari dan rawan kecelakaan.",
                   "Jadwalkan penggantian lampu PJU dan periksa instalasi kelistrikan di sekitar titik tersebut."),
    "Drainase": ("Saluran Air Tersumbat", "HIGH",
                 "Saluran drainase terlihat tersumbat oleh endapan dan sampah sehingga berisiko menyebabkan genangan saat hujan.",
                 "Lakukan pengerukan saluran dan agendakan kerja bakti pembersihan drainase."),
    "Keamanan": ("Potensi Gangguan Keamanan", "MEDIUM",
                 "Kondisi pada gambar menunjukkan area dengan pengawasan minim yang berpotensi menimbulkan gangguan keamanan.",
                 "Tingkatkan frekuensi ronda malam dan pertimbangkan penambahan penerangan atau CCTV."),
    "Lingkungan": ("Kerusakan Lingkungan", "MEDIUM",
                   "Terdeteksi kondisi lingkungan yang kurang terawat dan dapat memengaruhi kenyamanan warga.",
                   "Agendakan gotong royong penataan lingkungan pada akhir pekan terdekat."),
    "Lainnya": ("Perlu Peninjauan", "LOW",
                "Objek pada gambar memerlukan peninjauan lebih lanjut oleh pengurus RT untuk menentukan kategori masalah.",
                "Lakukan verifikasi lapangan oleh pengurus RT sebelum menentukan tindakan lanjutan."),
}


def provider_mode() -> str:
    mode = (os.environ.get("AI_PROVIDER") or "mock").lower()
    if mode == "external" and not os.environ.get("EMERGENT_LLM_KEY"):
        return "mock"
    return mode


def _mock_vision(image_bytes: bytes, hint: str | None, description: str) -> dict:
    text = f"{hint or ''} {description}".lower()
    picked = None
    keywords = {
        "Drainase": ["drainase", "saluran", "gorong", "banjir", "genangan"],
        "Penerangan": ["lampu", "penerangan", "pju", "gelap"],
        "Sampah": ["sampah", "tumpukan", "bau", "tps"],
        "Keamanan": ["keamanan", "pencuri", "curi", "ronda"],
        "Infrastruktur": ["jalan", "aspal", "lubang", "rusak", "trotoar", "jembatan"],
        "Lingkungan": ["pohon", "taman", "lingkungan", "rumput"],
    }
    for cat, words in keywords.items():
        if any(w in text for w in words):
            picked = cat
            break
    if hint in CATEGORIES:
        picked = hint
    if not picked:
        digest = hashlib.sha256(image_bytes or b"nusa").hexdigest()
        picked = CATEGORIES[int(digest[:8], 16) % len(CATEGORIES)]
    issue, severity, summary, action = MOCK_TEMPLATES[picked]
    seed = int(hashlib.sha256((picked + str(len(image_bytes))).encode()).hexdigest()[:6], 16)
    confidence = 0.78 + (seed % 18) / 100
    return {
        "category": picked, "issue": issue, "severity": severity,
        "confidence": round(confidence, 2), "summary": summary,
        "recommended_action": action, "provider": "mock",
    }


VISION_PROMPT = """Kamu adalah mesin analisis laporan warga untuk aplikasi NUSA (RT 09 / RW 04, Desa Sukamaju).
Analisis foto masalah lingkungan warga ini dan balas HANYA JSON valid dengan skema:
{"category": salah satu dari ["Infrastruktur","Sampah","Penerangan","Drainase","Keamanan","Lingkungan","Lainnya"],
 "issue": "judul masalah singkat bahasa Indonesia",
 "severity": "HIGH" | "MEDIUM" | "LOW",
 "confidence": angka 0-1,
 "summary": "2-3 kalimat ringkasan profesional bahasa Indonesia",
 "recommended_action": "1-2 kalimat rekomendasi tindakan untuk pengurus RT"}"""


async def analyze_image(image_bytes: bytes, mime: str, hint: str | None, description: str) -> dict:
    if provider_mode() == "mock":
        return _mock_vision(image_bytes, hint, description)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"vision-{uuid.uuid4()}",
            system_message=VISION_PROMPT,
        ).with_model(os.environ.get("LLM_PROVIDER", "gemini"), os.environ.get("LLM_MODEL", "gemini-3-flash-preview"))
        msg = UserMessage(
            text=f"Kategori dugaan warga: {hint or 'tidak disebutkan'}. Deskripsi warga: {description or '-'}. Balas JSON saja.",
            file_contents=[ImageContent(image_base64=base64.b64encode(image_bytes).decode())],
        )
        raw = await chat.send_message(msg)
        text = raw if isinstance(raw, str) else str(raw)
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
        if data.get("category") not in CATEGORIES:
            data["category"] = hint if hint in CATEGORIES else "Lainnya"
        data["severity"] = str(data.get("severity", "MEDIUM")).upper()
        data["confidence"] = float(data.get("confidence", 0.85))
        data["provider"] = "external"
        return data
    except Exception as e:
        logger.warning(f"AI vision fallback ke mock: {e}")
        return _mock_vision(image_bytes, hint, description)


def _mock_answer(question: str, ctx: dict) -> dict:
    q = question.lower()
    ov = ctx["overview"]
    ra = ctx["report_analytics"]
    ins = ctx["insights"]
    rupiah = lambda v: "Rp " + f"{int(v):,}".replace(",", ".")
    top = ra["by_category"][0] if ra["by_category"] else {"name": "-", "value": 0, "percent": 0}
    if any(k in q for k in ["uang", "kas", "keuangan", "pengeluaran", "dana", "saldo", "belanja", "biaya"]):
        fin = next((i for i in ins if i["source"] == "Kas Warga"), ins[0])
        answer = (f"Saldo kas warga saat ini {rupiah(ov['balance'])}. Bulan ini pemasukan {rupiah(ov['monthly_income'])} "
                  f"dan pengeluaran {rupiah(ov['monthly_expense'])}.\n\n{fin['title']}. {fin['detail']}\n\n"
                  f"Skor transparansi keuangan berada pada {ov['transparency_score']}/100.\n\nRekomendasi: {fin['action']}")
        return {"answer": answer, "sources": ["Kas Warga", "Analitik Komunitas"], "provider": "mock"}
    if any(k in q for k in ["prioritas", "minggu ini", "harus", "fokus", "rekomendasi"]):
        infra = ins[0]
        answer = (f"Berdasarkan {ov['reports_total']} laporan warga, prioritas minggu ini:\n\n"
                  f"1. {infra['action']}\n2. Tindak lanjuti {ov['urgent']} laporan berprioritas HIGH yang belum selesai.\n"
                  f"3. Jadwalkan perawatan penerangan jalan dan pembersihan drainase.\n\n"
                  f"Skor Community Pulse saat ini {ov['pulse']}/100 ({ov['status']}), dengan skor infrastruktur "
                  f"{ov['breakdown']['infrastructure']} sebagai komponen terendah.")
        return {"answer": answer, "sources": ["Laporan Warga", "Kegiatan Komunitas", "Analitik Komunitas"], "provider": "mock"}
    if any(k in q for k in ["belum selesai", "unresolved", "berapa laporan", "laporan", "masalah", "keluhan"]):
        answer = (f"Saat ini terdapat {ov['reports_open']} laporan belum ditangani, {ov['reports_progress']} sedang ditangani, "
                  f"dan {ov['reports_resolved']} sudah selesai dari total {ov['reports_total']} laporan.\n\n"
                  f"Kategori terbesar adalah {top['name']} dengan {top['value']} laporan ({top['percent']}% dari seluruh laporan).\n\n"
                  f"{ins[0]['detail']}\n\nRekomendasi prioritas: {ins[0]['action']}")
        return {"answer": answer, "sources": ["Laporan Warga", "Analitik Komunitas"], "provider": "mock"}
    if any(k in q for k in ["kegiatan", "acara", "gotong", "posyandu"]):
        acts = ctx["activities"][:4]
        lines = "\n".join(f"- {a['nama']} ({a['tanggal']}) — {a['partisipan']} peserta" for a in acts)
        return {"answer": f"Kegiatan komunitas terbaru:\n\n{lines}\n\nSkor partisipasi warga: {ov['breakdown']['engagement']}/100.",
                "sources": ["Kegiatan Komunitas"], "provider": "mock"}
    if any(k in q for k in ["pulse", "skor", "turun", "naik", "kesehatan"]):
        b = ov["breakdown"]
        answer = (f"Community Pulse RT 09 / RW 04 saat ini {ov['pulse']}/100 dengan status {ov['status']}.\n\n"
                  f"Rincian: Infrastruktur {b['infrastructure']}, Keamanan {b['safety']}, Kebersihan {b['cleanliness']}, "
                  f"Keuangan {b['finance']}, Partisipasi {b['engagement']}.\n\n{ins[0]['title']} — {ins[0]['detail']}")
        return {"answer": answer, "sources": ["Analitik Komunitas", "Laporan Warga"], "provider": "mock"}
    answer = (f"Ringkasan komunitas RT 09 / RW 04: Community Pulse {ov['pulse']}/100 ({ov['status']}), "
              f"{ov['reports_open']} laporan belum selesai, {ov['urgent']} laporan mendesak, saldo kas {rupiah(ov['balance'])}.\n\n"
              f"Perhatian utama: {ins[0]['title']}. {ins[0]['detail']}\n\nRekomendasi: {ins[0]['action']}")
    return {"answer": answer, "sources": ["Laporan Warga", "Kas Warga", "Kegiatan Komunitas"], "provider": "mock"}


CHAT_PROMPT = """Kamu adalah NUSA AI, asisten intelijen komunitas untuk RT 09 / RW 04 Desa Sukamaju, Indonesia.
Jawab SELALU dalam bahasa Indonesia yang profesional namun ramah, singkat (maksimal 180 kata), berbasis DATA JSON komunitas yang diberikan.
Sebutkan angka konkret dari data. Akhiri dengan rekomendasi tindakan bila relevan. Jangan mengarang data yang tidak ada."""


async def ask(question: str, ctx: dict, session_id: str) -> dict:
    if provider_mode() == "mock":
        return _mock_answer(question, ctx)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=session_id,
            system_message=CHAT_PROMPT,
        ).with_model(os.environ.get("LLM_PROVIDER", "gemini"), os.environ.get("LLM_MODEL", "gemini-3-flash-preview"))
        payload = json.dumps(ctx, ensure_ascii=False, default=str)
        raw = await chat.send_message(UserMessage(text=f"DATA KOMUNITAS:\n{payload}\n\nPERTANYAAN WARGA: {question}"))
        answer = raw if isinstance(raw, str) else str(raw)
        return {"answer": answer.strip(), "sources": ["Laporan Warga", "Kas Warga", "Kegiatan Komunitas"], "provider": "external"}
    except Exception as e:
        logger.warning(f"AI chat fallback ke mock: {e}")
        return _mock_answer(question, ctx)


async def monthly_report(ctx: dict) -> dict:
    ov = ctx["overview"]
    ra = ctx["report_analytics"]
    ins = ctx["insights"]
    rupiah = lambda v: "Rp " + f"{int(v):,}".replace(",", ".")
    cats = ", ".join(f"{c['name']} {c['percent']}%" for c in ra["by_category"][:4])
    base = {
        "executive_summary": (f"Community Pulse RT 09 / RW 04 berada pada {ov['pulse']}/100 dengan status {ov['status']}. "
                              f"Tercatat {ov['reports_total']} laporan warga, {ov['reports_resolved']} selesai dan {ov['reports_open']} "
                              f"belum ditangani. Saldo kas warga {rupiah(ov['balance'])} dengan skor transparansi {ov['transparency_score']}/100."),
        "community_overview": (f"Jumlah warga terdata {ov['residents']} jiwa dalam {ov['households']} kepala keluarga. "
                               f"Terdapat {ov['activities']} kegiatan komunitas dengan skor partisipasi {ov['breakdown']['engagement']}/100."),
        "resident_activity": "\n".join(f"- {a['nama']} ({a['tanggal']}): {a['partisipan']} dari target {a['target']} warga" for a in ctx["activities"][:5]),
        "community_issues": f"Distribusi laporan: {cats}. Laporan mendesak yang belum selesai: {ov['urgent']}.",
        "infrastructure": f"Skor infrastruktur {ov['breakdown']['infrastructure']}/100. {ins[0]['detail']}",
        "cleanliness": f"Skor kebersihan {ov['breakdown']['cleanliness']}/100. {ins[1]['detail']}",
        "safety": f"Skor keamanan {ov['breakdown']['safety']}/100. Ronda malam dan patroli warga berjalan sesuai jadwal.",
        "finance": (f"Pemasukan bulan ini {rupiah(ov['monthly_income'])}, pengeluaran {rupiah(ov['monthly_expense'])}, "
                    f"saldo akhir {rupiah(ov['balance'])}. {ins[2]['detail']}"),
        "resolved_issues": f"{ov['reports_resolved']} laporan telah diselesaikan pengurus RT.",
        "pending_issues": f"{ov['reports_open']} laporan menunggu tindak lanjut dan {ov['reports_progress']} sedang ditangani.",
        "recommendations": [i["action"] for i in ins[:4]],
        "provider": "mock",
    }
    if provider_mode() == "mock":
        return base
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"monthly-{uuid.uuid4()}",
            system_message=("Kamu penyusun laporan bulanan komunitas RT/RW Indonesia. Balas HANYA JSON dengan kunci: "
                            "executive_summary, community_overview, resident_activity, community_issues, infrastructure, "
                            "cleanliness, safety, finance, resolved_issues, pending_issues, recommendations (array 4 string). "
                            "Semua nilai dalam bahasa Indonesia formal, berbasis data yang diberikan, tanpa mengarang."),
        ).with_model(os.environ.get("LLM_PROVIDER", "gemini"), os.environ.get("LLM_MODEL", "gemini-3-flash-preview"))
        raw = await chat.send_message(UserMessage(text=json.dumps(ctx, ensure_ascii=False, default=str)))
        text = (raw if isinstance(raw, str) else str(raw)).strip()
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
        base.update({k: v for k, v in data.items() if v})
        base["provider"] = "external"
        return base
    except Exception as e:
        logger.warning(f"AI monthly report fallback ke mock: {e}")
        return base
