import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Home, FileText, TriangleAlert, ArrowRight, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { api, errText, rupiah, tanggal, bulanLabel } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Stat, Skeleton, ErrorBox, PulseGauge, InsightCard, SectionTitle, StatusBadge, SeverityBadge } from "@/components/Shared";

export default function AdminDashboard() {
  const [ov, setOv] = useState(null);
  const [insights, setInsights] = useState([]);
  const [reports, setReports] = useState([]);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    Promise.all([api.get("/analytics/overview"), api.get("/analytics/insights"), api.get("/reports/all")])
      .then(([o, i, r]) => { setOv(o.data); setInsights(i.data); setReports(r.data.slice(0, 6)); })
      .catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  return (
    <AdminLayout>
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">NUSA Command Center</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight md:text-4xl">RT 09 / RW 04</h1>
          <p className="mt-1 text-sm text-slate-500">Desa Sukamaju · {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
        </div>
        <Link data-testid="admin-monthly-cta" to="/admin/reports/monthly" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-95">
          <Sparkles className="h-4 w-4 text-emerald-400" /> Laporan Bulanan AI
        </Link>
      </div>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      {!ov ? (
        <div className="mt-8 grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat testId="admin-stat-residents" label="Warga" value={ov.residents.toLocaleString("id-ID")} sub={`${ov.residents_registered} terdata detail`} icon={Users} />
            <Stat testId="admin-stat-households" label="Kepala Keluarga" value={ov.households} sub={`${ov.households_registered} KK terdata`} icon={Home} />
            <Stat testId="admin-stat-open" label="Laporan Terbuka" value={ov.reports_open} sub={`${ov.reports_progress} sedang ditangani`} icon={FileText} />
            <Stat testId="admin-stat-urgent" label="Isu Mendesak" value={ov.urgent} sub="prioritas HIGH belum selesai" icon={TriangleAlert} accent />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div data-testid="admin-pulse-card" className="nusa-card p-6 lg:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Community Pulse</p>
              <div className="mt-5 flex justify-center"><PulseGauge score={ov.pulse} status={ov.status} /></div>
              <div className="mt-6 space-y-2.5">
                {Object.entries({
                  Infrastruktur: ov.breakdown.infrastructure, Keamanan: ov.breakdown.safety,
                  Kebersihan: ov.breakdown.cleanliness, Keuangan: ov.breakdown.finance,
                  Partisipasi: ov.breakdown.engagement,
                }).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-slate-500"><span>{k}</span><span className="font-medium text-slate-900">{v}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${v}%`, transition: "width 800ms" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="nusa-card p-6 lg:col-span-2">
              <SectionTitle overline="Tren 6 Bulan" title="Pergerakan Community Pulse" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ov.trend.map((t) => ({ ...t, label: bulanLabel(t.month) }))}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Line type="monotone" dataKey="pulse" name="Pulse" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="infrastructure" name="Infrastruktur" stroke="#94A3B8" strokeWidth={1.6} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Saldo Kas</p><p className="mt-1 font-display text-lg font-semibold">{rupiah(ov.balance)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Pemasukan Bulan Ini</p><p className="mt-1 font-display text-lg font-semibold text-emerald-700">{rupiah(ov.monthly_income)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Pengeluaran Bulan Ini</p><p className="mt-1 font-display text-lg font-semibold text-rose-700">{rupiah(ov.monthly_expense)}</p></div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Wawasan NUSA" title="NUSA AI Insights" right={
              <Link data-testid="admin-ai-link" to="/admin/ai" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">Tanya NUSA <ArrowRight className="h-3 w-3" /></Link>
            } />
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Aktivitas Terbaru" title="Laporan Warga Masuk" right={
              <Link data-testid="admin-reports-link" to="/admin/reports" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">Kelola <ArrowRight className="h-3 w-3" /></Link>
            } />
            <div className="nusa-card divide-y divide-slate-100">
              {reports.map((r, i) => (
                <div key={r.id} data-testid={`admin-recent-report-${i}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-[11px] text-slate-400">{r.category} · RT {r.rt} · {tanggal(r.created_at)} · {r.reporter_name}</p>
                  </div>
                  <SeverityBadge severity={r.severity} />
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
