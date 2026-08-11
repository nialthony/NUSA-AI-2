import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowUpRight, ArrowDownRight, Loader2, Paperclip, ReceiptText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { api, errText, rupiah, tanggal, bulanLabel, KATEGORI_KAS, API } from "@/lib/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Stat, Skeleton, ErrorBox, SectionTitle } from "@/components/Shared";
import { AskNusa } from "@/components/AskNusa";

export default function AdminFinance() {
  const [data, setData] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ description: "", category: "Iuran Warga", type: "income", amount: "" });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const receiptRef = useRef(null);
  const targetTx = useRef(null);

  const load = () => {
    setErr("");
    Promise.all([api.get("/finance"), api.get("/finance/monthly")])
      .then(([f, m]) => { setData(f.data); setMonthly(m.data); })
      .catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !Number(form.amount)) return toast.error("Deskripsi dan jumlah wajib diisi");
    setSaving(true);
    try {
      await api.post("/finance", { ...form, amount: Number(form.amount) });
      toast.success("Transaksi tercatat di kas warga");
      setForm({ description: "", category: "Iuran Warga", type: "income", amount: "" });
      setOpen(false);
      load();
    } catch (e2) {
      toast.error(errText(e2));
    } finally {
      setSaving(false);
    }
  };

  const pickReceipt = (txId) => {
    targetTx.current = txId;
    receiptRef.current?.click();
  };

  const uploadReceipt = async (e) => {
    const file = e.target.files?.[0];
    const txId = targetTx.current;
    e.target.value = "";
    if (!file || !txId) return;
    setUploadingId(txId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/finance/${txId}/receipt`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Bukti transaksi tersimpan dan bisa dilihat warga");
      load();
    } catch (e2) {
      toast.error(errText(e2));
    } finally {
      setUploadingId(null);
    }
  };


  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Transparansi Keuangan</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">Kas Warga</h1>
        </div>
        <button
          data-testid="add-tx-btn" onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Catat Transaksi
        </button>
      </div>

      {open && (
        <form data-testid="tx-form" onSubmit={submit} className="nusa-card animate-rise mt-6 grid gap-4 p-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="desc" className="text-[10px] uppercase tracking-wider text-slate-400">Deskripsi</label>
            <input
              id="desc" data-testid="tx-description-input" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Iuran warga bulan ini"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label htmlFor="type" className="text-[10px] uppercase tracking-wider text-slate-400">Tipe</label>
            <select
              id="type" data-testid="tx-type-select" value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>
          <div>
            <label htmlFor="cat" className="text-[10px] uppercase tracking-wider text-slate-400">Kategori</label>
            <select
              id="cat" data-testid="tx-category-select" value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {KATEGORI_KAS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="amt" className="text-[10px] uppercase tracking-wider text-slate-400">Jumlah (Rp)</label>
            <input
              id="amt" data-testid="tx-amount-input" type="number" min="1" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="500000"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-3">
            <button
              data-testid="tx-submit-btn" type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 active:scale-95 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Transaksi
            </button>
            <button type="button" data-testid="tx-cancel-btn" onClick={() => setOpen(false)} className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100">Batal</button>
          </div>
        </form>
      )}

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      {!data ? (
        <div className="mt-7 grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat testId="fin-balance" label="Saldo Kas" value={rupiah(data.summary.balance)} accent />
            <Stat testId="fin-income" label="Pemasukan Bulan Ini" value={rupiah(data.summary.monthly_income)} icon={ArrowUpRight} />
            <Stat testId="fin-expense" label="Pengeluaran Bulan Ini" value={rupiah(data.summary.monthly_expense)} icon={ArrowDownRight} />
            <Stat testId="fin-transparency" label="Skor Transparansi" value={`${data.summary.transparency_score}/100`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="nusa-card p-6">
              <SectionTitle overline="6 Bulan" title="Pemasukan vs Pengeluaran" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly.map((m) => ({ ...m, label: bulanLabel(m.month) }))}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v / 1000000}jt`} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Pengeluaran" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <SectionTitle overline="Wawasan Keuangan" title="Tanya NUSA" />
              <AskNusa compact suggestions={["Mengapa pengeluaran naik bulan ini?", "Berapa total pengeluaran infrastruktur?", "Bagaimana kondisi transparansi kas?"]} />
            </div>
          </div>

          <input
            ref={receiptRef} data-testid="receipt-file-input" type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf" onChange={uploadReceipt} className="hidden"
          />

          <div className="mt-8">
            <SectionTitle
              overline="Buku Kas"
              title={`${data.transactions.length} transaksi`}
              right={<span className="text-xs text-slate-500">{data.transactions.filter((t) => t.receipt_path).length} transaksi berbukti</span>}
            />
            <div className="nusa-card overflow-x-auto">
              <table data-testid="finance-table" className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                    {["Tanggal", "Deskripsi", "Kategori", "Tipe", "Bukti", "Jumlah"].map((h, i) => (
                      <th key={h} className={`px-5 py-3 font-medium ${i === 5 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t, i) => (
                    <tr key={t.id} data-testid={`tx-row-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-slate-600">{tanggal(t.date)}</td>
                      <td className="px-5 py-3 font-medium">{t.description}</td>
                      <td className="px-5 py-3 text-slate-600">{t.category}</td>
                      <td className="px-5 py-3 text-slate-600">{t.type === "income" ? "Pemasukan" : "Pengeluaran"}</td>
                      <td className="px-5 py-3">
                        {t.receipt_path ? (
                          <a
                            data-testid={`receipt-view-${i}`} href={`${API}/files/${t.receipt_path}`}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                          >
                            <ReceiptText className="h-3.5 w-3.5" /> Lihat bukti
                          </a>
                        ) : (
                          <button
                            data-testid={`receipt-upload-${i}`} onClick={() => pickReceipt(t.id)}
                            disabled={uploadingId === t.id}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                          >
                            {uploadingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                            Unggah
                          </button>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${t.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                        {t.type === "income" ? "+" : "−"} {rupiah(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
