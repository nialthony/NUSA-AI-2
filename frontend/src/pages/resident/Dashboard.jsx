import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Wallet, Megaphone, Sparkles, ArrowRight } from "lucide-react";
import { api, errText, rupiah, tanggal } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ResidentLayout } from "@/components/ResidentLayout";
import { AskNusa } from "@/components/AskNusa";
import { Skeleton, ErrorBox, StatusBadge, SectionTitle } from "@/components/Shared";

const SUGGESTIONS = [
  "Masalah apa yang sedang terjadi di lingkungan kami?",
  "Berapa saldo kas warga saat ini?",
  "Bagaimana cara melaporkan lampu jalan mati?",
  "Tampilkan kegiatan komunitas bulan ini.",
];

const QUICK = [
  { to: "/resident/report", label: "Laporkan Masalah", icon: Camera, id: "report" },
  { to: "/resident/finance", label: "Kas Warga", icon: Wallet, id: "finance" },
  { to: "/resident/community", label: "Pengumuman", icon: Megaphone, id: "announcements" },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
};

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [ov, setOv] = useState(null);
  const [ann, setAnn] = useState([]);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    Promise.all([api.get("/analytics/overview"), api.get("/announcements")])
      .then(([o, a]) => { setOv(o.data); setAnn(a.data.slice(0, 3)); })
      .catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  return (
    <ResidentLayout>
      <div className="animate-rise">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">Ada yang bisa NUSA bantu hari ini?</p>
      </div>

      <div className="mt-6">
        <AskNusa suggestions={SUGGESTIONS} compact />
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3">
        {QUICK.map(({ to, label, icon: Icon, id }) => (
          <Link
            key={id}
            to={to}
            data-testid={`quick-${id}`}
            className="nusa-card flex flex-col items-center gap-2 p-4 text-center transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50">
              <Icon className="h-5 w-5 text-emerald-700" strokeWidth={1.8} />
            </span>
            <span className="text-xs font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      <div className="mt-8">
        <SectionTitle overline="Ringkasan Komunitas" title="RT 09 / RW 04" />
        {!ov ? (
          <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Community Pulse", `${ov.pulse} / 100`, ov.status, "resident-pulse"],
              ["Belum Terselesaikan", ov.reports_open, `${ov.urgent} mendesak`, "resident-open"],
              ["Sudah Selesai", ov.reports_resolved, `dari ${ov.reports_total} laporan`, "resident-resolved"],
              ["Kas Warga", rupiah(ov.balance), `Masuk ${rupiah(ov.monthly_income)} bln ini`, "resident-balance"],
            ].map(([l, v, s, tid]) => (
              <div key={l} data-testid={tid} className="nusa-card p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{l}</p>
                <p className="mt-2 font-display text-xl font-semibold tracking-tight">{v}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{s}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <SectionTitle
          overline="Kabar Lingkungan"
          title="Pengumuman Terbaru"
          right={<Link data-testid="see-all-announcements" to="/resident/community" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">Semua <ArrowRight className="h-3 w-3" /></Link>}
        />
        <div className="space-y-3">
          {ann.length === 0 && <Skeleton className="h-20" />}
          {ann.map((a, i) => (
            <div key={a.id} data-testid={`resident-ann-${i}`} className="nusa-card animate-rise p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold">{a.title}</p>
                <StatusBadge status={a.category} />
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{a.body}</p>
              <p className="mt-2 text-[11px] text-slate-400">{tanggal(a.created_at)} · {a.created_by}</p>
            </div>
          ))}
        </div>
      </div>

      <Link
        data-testid="floating-report-btn"
        to="/resident/report"
        className="fixed bottom-20 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:bg-slate-800 active:scale-95"
      >
        <Sparkles className="h-4 w-4 text-emerald-400" /> Smart Report
      </Link>
    </ResidentLayout>
  );
}
