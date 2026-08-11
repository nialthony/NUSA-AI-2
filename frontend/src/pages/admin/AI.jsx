import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Loader2 } from "lucide-react";
import { api, errText, tanggal } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { AskNusa } from "@/components/AskNusa";
import { SectionTitle, InsightCard, Skeleton, Badge } from "@/components/Shared";

const SUGGESTIONS = [
  "Apa masalah terbesar di lingkungan kami?",
  "Berapa laporan yang belum terselesaikan?",
  "Mengapa skor infrastruktur menurun?",
  "Berapa pengeluaran kas bulan ini?",
  "Apa yang harus kami prioritaskan minggu ini?",
];

export default function AdminAI() {
  const [insights, setInsights] = useState(null);
  const [ann, setAnn] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", category: "Umum", pinned: false });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get("/analytics/insights").then(({ data }) => setInsights(data)).catch(() => setInsights([]));
    api.get("/announcements").then(({ data }) => setAnn(data)).catch(() => {});
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3 || form.body.trim().length < 5) return toast.error("Judul dan isi pengumuman wajib diisi");
    setSaving(true);
    try {
      await api.post("/announcements", form);
      toast.success("Pengumuman dipublikasikan ke warga");
      setForm({ title: "", body: "", category: "Umum", pinned: false });
      setOpen(false);
      load();
    } catch (e2) {
      toast.error(errText(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Asisten Intelijen Komunitas</p>
      <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">NUSA AI</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
        Tanyakan kondisi lingkungan, prioritas mingguan, atau kondisi kas. NUSA AI menjawab berdasarkan laporan warga,
        transaksi kas, dan kegiatan komunitas RT 09 / RW 04.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AskNusa suggestions={SUGGESTIONS} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <SectionTitle overline="Wawasan NUSA" title="Ringkasan Otomatis" />
          {insights === null ? <Skeleton className="h-40" /> : insights.slice(0, 3).map((ins, i) => <InsightCard key={i} insight={ins} index={i} />)}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle overline="Komunikasi" title="Pengumuman Warga" />
          <button
            data-testid="add-announcement-btn" onClick={() => setOpen((o) => !o)}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Buat Pengumuman
          </button>
        </div>

        {open && (
          <form data-testid="announcement-form" onSubmit={submit} className="nusa-card animate-rise mb-6 grid gap-4 p-6">
            <div>
              <label htmlFor="atitle" className="text-[10px] uppercase tracking-wider text-slate-400">Judul</label>
              <input
                id="atitle" data-testid="ann-title-input" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Kerja Bakti Minggu Pagi"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label htmlFor="abody" className="text-[10px] uppercase tracking-wider text-slate-400">Isi Pengumuman</label>
              <textarea
                id="abody" data-testid="ann-body-input" rows={3} value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Seluruh warga diharapkan hadir pada..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="acat" className="text-[10px] uppercase tracking-wider text-slate-400">Kategori</label>
                <select
                  id="acat" data-testid="ann-category-select" value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                >
                  {["Umum", "Kegiatan", "Rapat", "Keuangan", "Pengumuman"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
                <input
                  data-testid="ann-pinned-checkbox" type="checkbox" checked={form.pinned}
                  onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                Sematkan di beranda warga
              </label>
              <button
                data-testid="ann-submit-btn" type="submit" disabled={saving}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:scale-95 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publikasikan
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {ann.map((a, i) => (
            <div key={a.id} data-testid={`admin-ann-${i}`} className="nusa-card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-display text-base font-semibold">
                  <Megaphone className="h-4 w-4 text-emerald-600" /> {a.title}
                </p>
                {a.pinned && <Badge className="bg-emerald-50 text-emerald-700">Disematkan</Badge>}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.body}</p>
              <p className="mt-3 text-[11px] text-slate-400">{a.category} · {tanggal(a.created_at)} · {a.created_by}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
