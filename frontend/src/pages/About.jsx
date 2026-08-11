import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-slate-200 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link data-testid="about-back-link" to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <Link data-testid="about-login-btn" to="/login" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Masuk</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Tentang NUSA</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Intelijen komunitas untuk lingkungan Indonesia
        </h1>
        <div className="mt-10 space-y-8 text-base leading-relaxed text-slate-700">
          <p>
            NUSA adalah sistem operasi komunitas berbasis AI untuk RT/RW di Indonesia. Kami percaya keputusan terbaik
            di tingkat lingkungan lahir dari data yang rapi: laporan warga, kondisi infrastruktur, kas lingkungan,
            data penduduk, dan partisipasi kegiatan.
          </p>
          <div className="nusa-card p-7">
            <h2 className="font-display text-xl font-semibold">Bagaimana NUSA bekerja</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Warga melaporkan masalah lewat foto dari ponsel.",
                "AI mengklasifikasi kategori, tingkat keparahan, dan menyusun rekomendasi.",
                "Pengurus RT melihat prioritas melalui Community Pulse dan Wawasan NUSA.",
                "Kas warga tercatat transparan dan dapat diaudit siapa pun.",
                "Laporan bulanan pengurus tersusun otomatis untuk rapat warga.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-display font-semibold text-emerald-600">{i + 1}.</span> {t}
                </li>
              ))}
            </ol>
          </div>
          <div className="nusa-card p-7">
            <h2 className="font-display text-xl font-semibold">Community Pulse</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Community Pulse adalah metrik utama NUSA, dihitung transparan dari lima komponen: kesehatan
              infrastruktur, keamanan, kebersihan, transparansi keuangan, dan partisipasi warga. Setiap komponen
              dinormalisasi ke skala 0–100, lalu dirata-ratakan. Skor berubah otomatis mengikuti data laporan,
              transaksi kas, dan kegiatan komunitas.
            </p>
          </div>
          <div className="nusa-card p-7">
            <h2 className="font-display text-xl font-semibold">Privasi & Kemandirian</h2>
            <p className="mt-3 text-sm leading-relaxed">
              NUSA dirancang dengan abstraksi penyedia AI. Bila kunci AI eksternal tidak tersedia, aplikasi tetap
              berjalan penuh menggunakan mesin analisis lokal berbasis data komunitas (mode <em>AI Demo</em>).
              Kunci API tidak pernah disimpan di sisi peramban.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
