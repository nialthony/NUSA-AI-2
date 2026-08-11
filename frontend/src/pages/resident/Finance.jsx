import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { api, errText, rupiah, tanggal } from "@/lib/api";
import { ResidentLayout } from "@/components/ResidentLayout";
import { AskNusa } from "@/components/AskNusa";
import { Skeleton, ErrorBox, SectionTitle } from "@/components/Shared";

export default function ResidentFinance() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    api.get("/finance").then(({ data }) => setData(data)).catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  return (
    <ResidentLayout>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Transparansi</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Kas Warga</h1>
      <p className="mt-1.5 text-sm text-slate-500">Setiap rupiah iuran warga tercatat dan bisa Anda periksa.</p>

      {err && <div className="mt-6"><ErrorBox message={err} onRetry={load} /></div>}

      {!data ? (
        <div className="mt-6 space-y-3"><Skeleton className="h-28" /><Skeleton className="h-24" /></div>
      ) : (
        <>
          <div className="mt-6 rounded-xl bg-slate-900 p-6 text-white">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Saldo Kas Saat Ini</p>
            <p data-testid="resident-finance-balance" className="mt-2 font-display text-3xl font-semibold tracking-tight">{rupiah(data.summary.balance)}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
              <div><p className="text-slate-400">Masuk (bln ini)</p><p className="mt-1 font-medium text-emerald-300">{rupiah(data.summary.monthly_income)}</p></div>
              <div><p className="text-slate-400">Keluar (bln ini)</p><p className="mt-1 font-medium text-rose-300">{rupiah(data.summary.monthly_expense)}</p></div>
              <div><p className="text-slate-400">Transparansi</p><p className="mt-1 font-medium">{data.summary.transparency_score}/100</p></div>
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Riwayat" title="Transaksi Terbaru" />
            <div className="nusa-card divide-y divide-slate-100">
              {data.transactions.slice(0, 25).map((t, i) => (
                <div key={t.id} data-testid={`resident-tx-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${t.type === "income" ? "bg-emerald-50" : "bg-rose-50"}`}>
                    {t.type === "income"
                      ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      : <ArrowDownRight className="h-4 w-4 text-rose-600" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="text-[11px] text-slate-400">{t.category} · {tanggal(t.date)}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${t.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                    {t.type === "income" ? "+" : "−"} {rupiah(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle overline="Wawasan NUSA" title="Tanya soal kas warga" />
            <AskNusa compact suggestions={["Mengapa pengeluaran naik bulan ini?", "Berapa saldo kas warga sekarang?", "Pengeluaran terbesar untuk apa?"]} />
          </div>
        </>
      )}
    </ResidentLayout>
  );
}
