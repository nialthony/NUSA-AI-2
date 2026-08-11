import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Database, Sparkles, Building2, Users } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Stat, Skeleton, ErrorBox, Badge, SectionTitle, AiModeChip, ThemeToggle } from "@/components/Shared";
import { NusaLogo } from "@/components/Logo";

export default function SuperAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    api.get("/superadmin/overview").then(({ data }) => setData(data)).catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <NusaLogo className="h-9 w-9" />
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">NUSA Platform</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:block">{user?.email}</span>
            <ThemeToggle className="h-8 w-8" />
            <button
              data-testid="superadmin-logout-btn" onClick={() => { logout(); navigate("/login"); }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Kontrol Platform</p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight md:text-4xl">Pengelolaan NUSA</h1>

        {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

        {!data ? (
          <div className="mt-8 grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat testId="sa-communities" label="Komunitas" value={data.communities.length} icon={Building2} />
              <Stat testId="sa-users" label="Akun Pengguna" value={data.users.length} icon={Users} />
              <Stat testId="sa-ai-queries" label="Pertanyaan ke AI" value={data.ai_queries} icon={Sparkles} accent />
              <Stat testId="sa-database" label="Basis Data" value={data.platform.database} icon={Database} />
            </div>

            <div className="mt-8">
              <SectionTitle overline="Wilayah" title="Komunitas Terdaftar" right={<AiModeChip provider={data.ai_provider} />} />
              <div className="grid gap-4 md:grid-cols-2">
                {data.communities.map((c, i) => (
                  <div key={c.name} data-testid={`sa-community-${i}`} className="nusa-card p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-semibold">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.village}</p>
                      </div>
                      <Badge className={c.status === "Aktif" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{c.status}</Badge>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-xs">
                      <div><p className="text-slate-400">Pulse</p><p className="mt-1 font-display text-lg font-semibold">{c.pulse || "—"}</p></div>
                      <div><p className="text-slate-400">Warga</p><p className="mt-1 font-display text-lg font-semibold">{c.residents.toLocaleString("id-ID")}</p></div>
                      <div><p className="text-slate-400">Laporan</p><p className="mt-1 font-display text-lg font-semibold">{c.reports}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <SectionTitle overline="Akses" title="Akun & Peran" />
              <div className="nusa-card overflow-x-auto">
                <table data-testid="sa-users-table" className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                      {["Nama", "Email", "Peran"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u, i) => (
                      <tr key={u.id} data-testid={`sa-user-${i}`} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3 font-medium">{u.name}</td>
                        <td className="px-5 py-3 text-slate-600">{u.email}</td>
                        <td className="px-5 py-3"><Badge className="bg-slate-100 capitalize text-slate-700">{u.role}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="nusa-card mt-8 p-6">
              <SectionTitle overline="Infrastruktur" title="Status Platform" />
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-slate-100 text-slate-700">Database: {data.platform.database}</Badge>
                <Badge className="bg-slate-100 text-slate-700">Penyimpanan: {data.platform.storage}</Badge>
                <Badge className="bg-slate-100 text-slate-700">Versi: {data.platform.version}</Badge>
                <AiModeChip provider={data.ai_provider} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
