import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errText, tanggal, KATEGORI, API } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Stat, Skeleton, ErrorBox, StatusBadge, SeverityBadge, Empty, SectionTitle } from "@/components/Shared";

const STATUSES = ["Terkirim", "Ditinjau", "Ditangani", "Selesai", "Ditolak"];

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [filters, setFilters] = useState({ category: "", severity: "", status: "", rt: "", q: "" });
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.get("/reports/all", { params })
      .then(({ data }) => setReports(data))
      .catch((e) => { setErr(errText(e)); setReports([]); });
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      toast.success(`Status diperbarui menjadi "${status}"`);
      load();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const count = (s) => (reports || []).filter((r) => (s === "open" ? ["Terkirim", "Ditinjau"].includes(r.status) : r.status === s)).length;

  const select = (key, label, options) => (
    <div>
      <label htmlFor={key} className="text-[10px] uppercase tracking-wider text-slate-400">{label}</label>
      <select
        id={key} data-testid={`filter-${key}`} value={filters[key]}
        onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      >
        <option value="">Semua</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <AdminLayout>
      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Manajemen Laporan</p>
      <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">Laporan Warga</h1>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat testId="rep-stat-total" label="Total Laporan" value={reports?.length ?? "—"} />
        <Stat testId="rep-stat-open" label="Belum Terselesaikan" value={count("open")} />
        <Stat testId="rep-stat-progress" label="Sedang Ditangani" value={count("Ditangani")} />
        <Stat testId="rep-stat-done" label="Sudah Selesai" value={count("Selesai")} accent />
      </div>

      <div className="nusa-card mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="q" className="text-[10px] uppercase tracking-wider text-slate-400">Cari</label>
          <input
            id="q" data-testid="filter-q" value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Judul laporan..."
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        {select("category", "Kategori", KATEGORI)}
        {select("severity", "Tingkat", ["HIGH", "MEDIUM", "LOW"])}
        {select("status", "Status", STATUSES)}
        {select("rt", "Lokasi RT", ["09", "04", "07", "11"])}
      </div>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      <div className="mt-6">
        <SectionTitle overline="Daftar" title={`${reports?.length ?? 0} laporan`} />
        {reports === null && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
        {reports?.length === 0 && !err && <Empty title="Tidak ada laporan sesuai filter" hint="Ubah atau kosongkan filter untuk melihat laporan lain." />}
        <div className="space-y-3">
          {reports?.map((r, i) => (
            <div key={r.id} data-testid={`admin-report-${i}`} className="nusa-card animate-rise p-5" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex flex-wrap gap-4">
                {r.image_path && <img src={`${API}/files/${r.image_path}`} alt={r.title} className="h-16 w-16 rounded-lg object-cover" />}
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold">{r.title}</p>
                    <SeverityBadge severity={r.severity} />
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{r.category} · {r.location} · {tanggal(r.created_at)} · Pelapor: {r.reporter_name}</p>
                  {r.analysis && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                      <span className="font-medium">AI ({Math.round(r.analysis.confidence * 100)}%):</span> {r.analysis.summary}
                      <span className="mt-1 block text-emerald-800">Rekomendasi: {r.analysis.recommended_action}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor={`st-${r.id}`} className="text-[10px] uppercase tracking-wider text-slate-400">Ubah Status</label>
                  <select
                    id={`st-${r.id}`} data-testid={`report-status-select-${i}`} value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
