import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api, errText, tanggal } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Stat, Skeleton, ErrorBox, Badge, SectionTitle, Empty } from "@/components/Shared";

export default function AdminResidents() {
  const [residents, setResidents] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [q, setQ] = useState("");
  const [rt, setRt] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    Promise.all([api.get("/residents"), api.get("/households")])
      .then(([r, h]) => { setResidents(r.data); setHouseholds(h.data); })
      .catch((e) => { setErr(errText(e)); setResidents([]); });
  };

  useEffect(load, []);

  const filtered = (residents || []).filter(
    (r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!rt || r.rt === rt)
  );

  return (
    <AdminLayout>
      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Data Kependudukan</p>
      <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">Data Warga</h1>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat testId="res-stat-total" label="Warga Terdata" value={residents?.length ?? "—"} />
        <Stat testId="res-stat-kk" label="Kepala Keluarga" value={households.length} />
        <Stat testId="res-stat-active" label="Warga Aktif" value={(residents || []).filter((r) => r.status === "Aktif").length} accent />
      </div>

      <div className="nusa-card mt-6 flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="search" className="text-[10px] uppercase tracking-wider text-slate-400">Cari Warga</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search" data-testid="resident-search-input" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Nama warga..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>
        </div>
        <div>
          <label htmlFor="rtf" className="text-[10px] uppercase tracking-wider text-slate-400">RT</label>
          <select
            id="rtf" data-testid="resident-rt-filter" value={rt} onChange={(e) => setRt(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
          >
            <option value="">Semua RT</option>
            {["09", "04", "07", "11"].map((r) => <option key={r} value={r}>RT {r}</option>)}
          </select>
        </div>
      </div>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      <div className="mt-6">
        <SectionTitle overline="Tabel Warga" title={`${filtered.length} warga`} />
        {residents === null ? (
          <Skeleton className="h-64" />
        ) : filtered.length === 0 ? (
          <Empty title="Warga tidak ditemukan" hint="Coba kata kunci atau filter RT yang berbeda." />
        ) : (
          <div className="nusa-card overflow-x-auto">
            <table data-testid="residents-table" className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                  {["Nama", "KK", "RT/RW", "Telepon", "Peran", "Status", "Aktivitas Terakhir"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} data-testid={`resident-row-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-5 py-3 text-slate-600">{r.household}</td>
                    <td className="px-5 py-3 text-slate-600">{r.rt} / {r.rw}</td>
                    <td className="px-5 py-3 text-slate-600">{r.phone}</td>
                    <td className="px-5 py-3 text-slate-600">{r.role_label}</td>
                    <td className="px-5 py-3">
                      <Badge className={r.status === "Aktif" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>{r.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{tanggal(r.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <SectionTitle overline="Kelompok" title="Kepala Keluarga" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {households.slice(0, 12).map((h, i) => (
            <div key={h.id} data-testid={`household-${i}`} className="nusa-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-semibold">{h.code}</p>
                <Badge className="bg-slate-100 text-slate-600">RT {h.rt} / RW {h.rw}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{h.head_name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{h.address} · {h.members_count} anggota</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
