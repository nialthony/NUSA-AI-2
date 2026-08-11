import { useEffect, useState } from "react";
import { Users, CalendarDays } from "lucide-react";
import { api, errText, tanggal } from "@/lib/api";
import { ResidentLayout } from "@/components/ResidentLayout";
import { Skeleton, ErrorBox, SectionTitle, Badge, PulseGauge, InsightCard } from "@/components/Shared";

export default function ResidentCommunity() {
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    Promise.all([api.get("/announcements"), api.get("/activities"), api.get("/analytics/pulse"), api.get("/analytics/insights")])
      .then(([a, act, p, i]) => setState({ ann: a.data, acts: act.data, pulse: p.data, insights: i.data }))
      .catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  return (
    <ResidentLayout>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Komunitas</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Lingkungan Kita</h1>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}
      {!state ? (
        <div className="mt-6 space-y-3"><Skeleton className="h-40" /><Skeleton className="h-28" /></div>
      ) : (
        <>
          <div className="mt-6 nusa-card flex items-center gap-6 p-6">
            <PulseGauge score={state.pulse.pulse} status={state.pulse.status} size={132} />
            <div className="flex-1 space-y-2">
              {Object.entries({
                Infrastruktur: state.pulse.breakdown.infrastructure,
                Keamanan: state.pulse.breakdown.safety,
                Kebersihan: state.pulse.breakdown.cleanliness,
                Keuangan: state.pulse.breakdown.finance,
                Partisipasi: state.pulse.breakdown.engagement,
              }).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-[11px] text-slate-500"><span>{k}</span><span className="font-medium text-slate-800">{v}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${v}%`, transition: "width 700ms" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Wawasan NUSA" title="Apa yang perlu diperhatikan" />
            <div className="space-y-3">
              {state.insights.slice(0, 3).map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Informasi" title="Pengumuman" />
            <div className="space-y-3">
              {state.ann.map((a, i) => (
                <div key={a.id} data-testid={`community-ann-${i}`} className="nusa-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-semibold">{a.title}</p>
                    {a.pinned && <Badge className="bg-emerald-50 text-emerald-700">Disematkan</Badge>}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{a.body}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{tanggal(a.created_at)} · {a.created_by}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Kegiatan" title="Agenda & Partisipasi" />
            <div className="space-y-3">
              {state.acts.map((a, i) => (
                <div key={a.id} data-testid={`community-activity-${i}`} className="nusa-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold">{a.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <CalendarDays className="h-3 w-3" /> {tanggal(a.date)} · {a.location}
                      </p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700">
                      <Users className="mr-1 h-3 w-3" /> {a.participants}/{a.target_participants}
                    </Badge>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (a.participants / a.target_participants) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ResidentLayout>
  );
}
