import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ResidentLayout } from "@/components/ResidentLayout";
import { Badge, AiModeChip } from "@/components/Shared";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [provider, setProvider] = useState("mock");

  useEffect(() => {
    api.get("/reports", { params: { mine: true } }).then(({ data }) => setReports(data)).catch(() => {});
    api.get("/config").then(({ data }) => setProvider(data.ai_provider)).catch(() => {});
  }, []);

  return (
    <ResidentLayout>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Akun</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Profil Saya</h1>

      <div className="mt-6 nusa-card p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 font-display text-xl font-semibold text-emerald-800">
            {(user?.name || "W").charAt(0)}
          </span>
          <div>
            <p data-testid="profile-name" className="font-display text-lg font-semibold">{user?.name}</p>
            <Badge className="mt-1 bg-slate-100 capitalize text-slate-700">{user?.role === "resident" ? "Warga" : user?.role}</Badge>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {user?.email}</p>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {user?.phone || "Belum diisi"}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> RT 09 / RW 04, Desa Sukamaju</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[["Total Laporan", reports.length], ["Selesai", reports.filter((r) => r.status === "Selesai").length],
          ["Diproses", reports.filter((r) => ["Ditinjau", "Ditangani"].includes(r.status)).length]].map(([l, v]) => (
          <div key={l} className="nusa-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
            <p className="mt-1.5 font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 nusa-card space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Status Sistem</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <AiModeChip provider={provider} />
          <Badge className="bg-slate-100 text-slate-600">Database PostgreSQL</Badge>
          <Badge className="bg-slate-100 text-slate-600">NUSA MVP 1.0</Badge>
        </div>
      </div>

      <button
        data-testid="profile-logout-btn"
        onClick={() => { logout(); navigate("/login"); }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" /> Keluar dari NUSA
      </button>
    </ResidentLayout>
  );
}
