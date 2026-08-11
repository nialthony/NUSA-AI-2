import { useState } from "react";
import { toast } from "sonner";
import { FileBarChart, Loader2, Printer, Sparkles } from "lucide-react";
import { api, errText, rupiah } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Empty, AiModeChip, Badge } from "@/components/Shared";

const SECTIONS = [
  ["executive_summary", "Ringkasan Eksekutif"],
  ["community_overview", "Gambaran Komunitas"],
  ["resident_activity", "Aktivitas Warga"],
  ["community_issues", "Isu Komunitas"],
  ["infrastructure", "Infrastruktur"],
  ["cleanliness", "Kebersihan"],
  ["safety", "Keamanan"],
  ["finance", "Keuangan"],
  ["resolved_issues", "Isu Terselesaikan"],
  ["pending_issues", "Isu Tertunda"],
];

export default function MonthlyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/ai/monthly-report");
      setReport(data);
      toast.success("Laporan bulanan berhasil disusun");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Laporan Bulanan AI</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">Laporan Pengurus RT</h1>
          <p className="mt-1.5 text-sm text-slate-500">Susun laporan profesional untuk rapat warga dalam satu klik.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            data-testid="generate-monthly-btn" onClick={generate} disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Menyusun laporan..." : "Buat Laporan Bulanan"}
          </button>
          {report && (
            <button
              data-testid="download-pdf-btn" onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Unduh PDF
            </button>
          )}
        </div>
      </div>

      {!report && !loading && (
        <div className="mt-8">
          <Empty
            title="Belum ada laporan bulanan"
            hint="Klik “Buat Laporan Bulanan” untuk menyusun laporan dari laporan warga, kas, dan kegiatan komunitas bulan ini."
            testId="monthly-empty"
          />
        </div>
      )}

      {loading && (
        <div data-testid="monthly-loading" className="nusa-card mt-8 space-y-3 p-8">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-200/70" style={{ width: `${90 - i * 9}%` }} />)}
        </div>
      )}

      {report && (
        <article data-testid="monthly-report" className="nusa-card mt-8 p-8 md:p-10">
          <header className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <FileBarChart className="h-3.5 w-3.5" /> Laporan Bulanan Komunitas
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">RT 09 / RW 04 · Desa Sukamaju</h2>
                <p className="mt-1 text-sm text-slate-500">Periode {report.period}</p>
              </div>
              <AiModeChip provider={report.ai_provider} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              {[["Community Pulse", `${report.metrics.pulse}/100`], ["Total Laporan", report.metrics.reports_total],
                ["Selesai", report.metrics.reports_resolved], ["Saldo Kas", rupiah(report.metrics.balance)]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
                  <p className="mt-1 font-display text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </header>

          <div className="mt-8 space-y-7">
            {SECTIONS.map(([key, label]) => (
              <section key={key} data-testid={`report-section-${key}`}>
                <h3 className="font-display text-base font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">{report[key]}</p>
              </section>
            ))}

            <section data-testid="report-section-recommendations" className="rounded-xl bg-emerald-50 p-6">
              <h3 className="font-display text-base font-semibold uppercase tracking-wide text-emerald-800">Rekomendasi AI</h3>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-emerald-900">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="font-semibold">{i + 1}.</span> {r}</li>
                ))}
              </ol>
            </section>
          </div>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400">
            <p>Disusun otomatis oleh NUSA AI · {new Date(report.generated_at).toLocaleString("id-ID")}</p>
            <Badge className="bg-slate-100 text-slate-600">NUSA — AI Community Operating System</Badge>
          </footer>
        </article>
      )}
    </AdminLayout>
  );
}
