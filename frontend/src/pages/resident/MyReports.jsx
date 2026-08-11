import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Plus } from "lucide-react";
import { api, errText, tanggal, API } from "@/lib/api";
import { ResidentLayout } from "@/components/ResidentLayout";
import { StatusBadge, SeverityBadge, Skeleton, Empty, ErrorBox } from "@/components/Shared";

export default function MyReports() {
  const [reports, setReports] = useState(null);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    api.get("/reports", { params: { mine: true } })
      .then(({ data }) => setReports(data))
      .catch((e) => { setErr(errText(e)); setReports([]); });
  };

  useEffect(load, []);

  return (
    <ResidentLayout>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Laporan Saya</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Riwayat Laporan</h1>
        </div>
        <Link data-testid="new-report-link" to="/resident/report" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-95">
          <Plus className="h-3.5 w-3.5" /> Baru
        </Link>
      </div>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      <div className="mt-6 space-y-3">
        {reports === null && [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}
        {reports?.length === 0 && !err && (
          <Empty
            title="Belum ada laporan"
            hint="Laporan pertama Anda akan muncul di sini. Coba foto satu masalah di sekitar rumah."
            action={<Link data-testid="empty-report-cta" to="/resident/report" className="mt-3 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Buat Laporan</Link>}
          />
        )}
        {reports?.map((r, i) => (
          <div key={r.id} data-testid={`my-report-${i}`} className="nusa-card animate-rise overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex gap-4 p-4">
              {r.image_path ? (
                <img src={`${API}/files/${r.image_path}`} alt={r.title} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] text-slate-400">Tanpa Foto</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold leading-snug">{r.title}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={r.severity} />
                  <span className="text-[11px] text-slate-500">{r.category}</span>
                </div>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3" /> {r.location} · {tanggal(r.created_at)}
                </p>
              </div>
            </div>
            {r.analysis?.summary && (
              <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-700">Analisis AI:</span> {r.analysis.summary}
              </p>
            )}
          </div>
        ))}
      </div>
    </ResidentLayout>
  );
}
