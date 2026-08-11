import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { api, errText, bulanLabel } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { ReportMap } from "@/components/ReportMap";
import { Stat, Skeleton, ErrorBox, SectionTitle, InsightCard } from "@/components/Shared";

const COLORS = ["#10B981", "#0F172A", "#F59E0B", "#3B82F6", "#94A3B8", "#EF4444", "#A7F3D0"];

export default function AdminAnalytics() {
  const [ra, setRa] = useState(null);
  const [ov, setOv] = useState(null);
  const [insights, setInsights] = useState([]);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    Promise.all([api.get("/analytics/reports"), api.get("/analytics/overview"), api.get("/analytics/insights")])
      .then(([r, o, i]) => { setRa(r.data); setOv(o.data); setInsights(i.data); })
      .catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  return (
    <AdminLayout>
      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Intelijen Komunitas</p>
      <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">Analitik</h1>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      {!ra || !ov ? (
        <div className="mt-7 grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat testId="an-total" label="Total Laporan" value={ra.total} />
            <Stat testId="an-pulse" label="Community Pulse" value={`${ov.pulse}/100`} sub={ov.status} accent />
            <Stat testId="an-resolution" label="Tingkat Penyelesaian" value={`${Math.round((ov.reports_resolved / (ra.total || 1)) * 100)}%`} />
            <Stat testId="an-engagement" label="Partisipasi Warga" value={`${ov.breakdown.engagement}/100`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="nusa-card p-6">
              <SectionTitle overline="Distribusi" title="Laporan per Kategori" />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ra.by_category} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2}>
                      {ra.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5">
                {ra.by_category.map((c, i) => (
                  <div key={c.name} data-testid={`cat-row-${i}`} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {c.name}
                    </span>
                    <span className="font-medium">{c.percent}% · {c.value} laporan</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="nusa-card p-6">
              <SectionTitle overline="Tren" title="Laporan per Bulan" />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ra.over_time.map((t) => ({ ...t, label: bulanLabel(t.month) }))}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="total" name="Masuk" stroke="#0F172A" fill="#0F172A" fillOpacity={0.08} strokeWidth={2} />
                    <Area type="monotone" dataKey="resolved" name="Selesai" stroke="#10B981" fill="#10B981" fillOpacity={0.16} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="nusa-card p-6">
              <SectionTitle overline="Tingkat Keparahan" title="Laporan per Severity" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ra.by_severity}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="value" name="Laporan" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="nusa-card p-6">
              <SectionTitle overline="Sebaran Wilayah" title="Laporan per RT" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ra.by_rt} layout="vertical">
                    <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="value" name="Laporan" fill="#10B981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6"><ReportMap /></div>

          <div className="mt-8">
            <SectionTitle overline="Wawasan NUSA" title="Analisis Otomatis" />
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
