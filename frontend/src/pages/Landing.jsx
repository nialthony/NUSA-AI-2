import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Sparkles, Activity, Wallet, FileBarChart, MessageSquareOff, FileSpreadsheet, ClipboardList, Check } from "lucide-react";
import { api } from "@/lib/api";

const FEATURES = [
  { icon: Camera, title: "Smart Report", desc: "Warga memotret masalah, AI langsung mengklasifikasi kategori, tingkat urgensi, dan rekomendasi tindakan." },
  { icon: Sparkles, title: "NUSA AI", desc: "Asisten intelijen komunitas yang menjawab pertanyaan pengurus dan warga berbasis data RT sendiri." },
  { icon: Activity, title: "Community Pulse", desc: "Satu skor kesehatan lingkungan dari infrastruktur, keamanan, kebersihan, keuangan, dan partisipasi." },
  { icon: Wallet, title: "Kas Warga Transparan", desc: "Setiap pemasukan dan pengeluaran tercatat, dapat dilihat warga, lengkap dengan skor transparansi." },
  { icon: FileBarChart, title: "Laporan Bulanan AI", desc: "Laporan pengurus RT tersusun otomatis dalam hitungan detik, siap dicetak untuk rapat warga." },
];

const PROBLEMS = [
  { icon: MessageSquareOff, t: "Grup WhatsApp penuh", d: "Laporan warga tenggelam di antara ratusan pesan dan tidak pernah ditindaklanjuti." },
  { icon: ClipboardList, t: "Laporan kertas", d: "Catatan pengurus tersimpan di buku tulis, hilang saat pergantian pengurus." },
  { icon: FileSpreadsheet, t: "Kas di spreadsheet", d: "Pembukuan manual sulit diaudit dan menimbulkan pertanyaan warga." },
];

export default function Landing() {
  const [stats, setStats] = useState({ residents: 1284, households: 382, open_reports: 27, pulse: 87 });

  useEffect(() => {
    api.get("/public/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" data-testid="landing-logo" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 font-display text-sm font-semibold text-white">N</span>
            <span className="font-display text-base font-semibold tracking-tight">NUSA</span>
          </Link>
          <nav className="flex items-center gap-2 md:gap-5">
            <Link data-testid="landing-about-link" to="/about" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 md:block">Tentang</Link>
            <a data-testid="landing-how-link" href="#solusi" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 md:block">Cara Kerja</a>
            <Link data-testid="landing-login-btn" to="/login" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 active:scale-95">
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <section className="nusa-grain border-b border-slate-200">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="animate-rise">
            <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">AI Community Operating System</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl lg:text-6xl">
              Lingkungan Anda punya data.
              <span className="block text-emerald-700">NUSA mengubahnya jadi intelijen.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600">
              Platform manajemen komunitas untuk RT/RW Indonesia. Laporan warga, data penduduk, dan kas lingkungan
              digabung menjadi keputusan yang bisa langsung dijalankan pengurus.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link data-testid="hero-demo-btn" to="/login" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95">
                Jelajahi Demo <ArrowRight className="h-4 w-4" />
              </Link>
              <a data-testid="hero-how-btn" href="#solusi" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50">
                Lihat Cara Kerja NUSA
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              {["Tanpa instalasi", "Berjalan di ponsel warga", "Siap dipakai satu RT hari ini"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> {t}</span>
              ))}
            </div>
          </div>

          <div data-testid="hero-preview" className="animate-rise nusa-card p-5 shadow-lg" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Community Pulse</p>
                <p className="font-display text-sm font-semibold">RT 09 / RW 04 · Desa Sukamaju</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">Live</span>
            </div>
            <div className="flex items-end gap-4 py-5">
              <p className="font-display text-6xl font-semibold leading-none tracking-tight">{stats.pulse}</p>
              <div className="flex-1">
                <div className="flex h-24 items-end gap-1.5">
                  {[62, 70, 66, 78, 74, 82, 79, 87].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-emerald-500/80"
                      style={{ height: `${h}%`, animation: `rise 700ms ${i * 60}ms cubic-bezier(.16,1,.3,1) both` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">Tren 8 periode terakhir</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-4">
              {[["Laporan Terbuka", stats.open_reports], ["Warga", stats.residents.toLocaleString("id-ID")], ["KK", stats.households]].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
                  <p className="font-display text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-900 p-4 text-white">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-3 w-3" /> Wawasan NUSA
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                Laporan drainase di RT 04 meningkat. Prioritaskan inspeksi saluran dalam 7 hari ke depan.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Masalahnya</p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Informasi lingkungan tercecer di lima tempat berbeda.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, t, d }, i) => (
              <div key={t} className="animate-rise rounded-xl border border-slate-200 p-6" style={{ animationDelay: `${i * 80}ms` }}>
                <Icon className="h-5 w-5 text-rose-500" strokeWidth={1.8} />
                <p className="mt-4 font-display text-lg font-semibold">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solusi" className="border-b border-slate-200 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">Solusi NUSA</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Laporkan → Pahami → Prioritaskan → Tindak</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              ["01", "Laporkan", "Warga memotret masalah dari ponsel dalam 20 detik."],
              ["02", "Pahami", "AI mengklasifikasi kategori, tingkat keparahan, dan ringkasan."],
              ["03", "Prioritaskan", "Community Pulse dan wawasan AI menunjukkan apa yang paling urgen."],
              ["04", "Tindak", "Pengurus menugaskan, menyelesaikan, dan melaporkan ke warga."],
            ].map(([n, t, d], i) => (
              <div key={n} className="animate-rise nusa-card p-6" style={{ animationDelay: `${i * 80}ms` }}>
                <p className="font-display text-2xl font-semibold text-emerald-600">{n}</p>
                <p className="mt-3 font-display text-lg font-semibold">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Fitur Utama</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Satu sistem operasi untuk seluruh lingkungan</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="animate-rise nusa-card p-6 transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50">
                  <Icon className="h-5 w-5 text-emerald-700" strokeWidth={1.8} />
                </span>
                <p className="mt-4 font-display text-lg font-semibold">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {[["Warga Terdata", stats.residents.toLocaleString("id-ID")], ["Kepala Keluarga", stats.households],
            ["Laporan Terbuka", stats.open_reports], ["Community Pulse", stats.pulse]].map(([l, v], i) => (
            <div key={l} data-testid={`impact-${i}`} className="animate-rise nusa-card p-7" style={{ animationDelay: `${i * 70}ms` }}>
              <p className="font-display text-4xl font-semibold tracking-tight">{v}</p>
              <p className="mt-2 text-sm text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">Mulai dari satu lingkungan.</h2>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Indonesia tidak butuh satu chatbot lagi. Indonesia butuh intelijen di level komunitas.
            NUSA dimulai dari satu RT.
          </p>
          <Link data-testid="final-cta-btn" to="/login" className="mt-9 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-emerald-400 active:scale-95">
            Coba Demo NUSA <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>NUSA · AI Community Operating System · MVP Demo</p>
          <p>RT 09 / RW 04 — Desa Sukamaju, Indonesia</p>
        </div>
      </footer>
    </div>
  );
}
