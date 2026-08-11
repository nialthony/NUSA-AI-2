import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Sparkles, MapPin, X } from "lucide-react";
import { api, errText, KATEGORI } from "@/lib/api";
import { ResidentLayout } from "@/components/ResidentLayout";
import { SeverityBadge, Badge, AiModeChip } from "@/components/Shared";

const RT_OPSI = ["09", "04", "07", "11"];

export default function NewReport() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [rt, setRt] = useState("09");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("Format gambar harus JPG, PNG, atau WEBP");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnalysis(null);
  };

  const analyze = async () => {
    if (!file) return toast.error("Unggah foto masalah terlebih dahulu");
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("description", description);
      if (category) fd.append("category", category);
      const { data } = await api.post("/reports/analyze", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAnalysis(data);
      toast.success("Analisis AI selesai");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      await api.post("/reports", {
        title: analysis.issue,
        description: description || analysis.summary,
        category: analysis.category,
        severity: analysis.severity,
        rt,
        location: `RT ${rt} / RW 04, Desa Sukamaju`,
        image_path: analysis.image_path || "",
        analysis,
      });
      toast.success("Laporan terkirim ke pengurus RT");
      navigate("/resident/reports");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setFile(null); setPreview(""); setAnalysis(null); setDescription(""); setCategory(""); };

  return (
    <ResidentLayout>
      <div className="animate-rise">
        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">Smart Report</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">Laporkan Masalah</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Ambil foto masalah di lingkungan Anda. NUSA AI akan menentukan kategori, tingkat urgensi, dan rekomendasi tindakan.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div className="nusa-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">1 · Foto Masalah</p>
          <input
            ref={fileRef} data-testid="report-file-input" type="file" accept="image/*" capture="environment"
            onChange={pick} className="hidden"
          />
          {!preview ? (
            <button
              data-testid="report-upload-btn"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-10 text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <Camera className="h-7 w-7 text-emerald-600" strokeWidth={1.6} />
              <span className="text-sm font-medium">Ambil Foto / Unggah Gambar</span>
              <span className="text-xs">JPG, PNG, atau WEBP · maks 8MB</span>
            </button>
          ) : (
            <div className="relative mt-3">
              <img data-testid="report-preview" src={preview} alt="Pratinjau laporan" className="h-56 w-full rounded-xl object-cover" />
              <button
                data-testid="report-remove-image" onClick={reset} aria-label="Hapus foto"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="nusa-card space-y-4 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">2 · Detail (opsional)</p>
          <textarea
            data-testid="report-description-input" rows={3} value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ceritakan singkat kondisinya, misal: lubang jalan makin besar setelah hujan..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cat" className="text-xs text-slate-500">Dugaan Kategori</label>
              <select
                id="cat" data-testid="report-category-select" value={category} onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              >
                <option value="">Biarkan AI menentukan</option>
                {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rt" className="text-xs text-slate-500">Lokasi (RT)</label>
              <select
                id="rt" data-testid="report-rt-select" value={rt} onChange={(e) => setRt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              >
                {RT_OPSI.map((r) => <option key={r} value={r}>RT {r} / RW 04</option>)}
              </select>
            </div>
          </div>
        </div>

        {!analysis && (
          <button
            data-testid="report-analyze-btn" onClick={analyze} disabled={analyzing || !file}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-95 disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-emerald-400" />}
            {analyzing ? "AI sedang menganalisis foto..." : "Analisis dengan NUSA AI"}
          </button>
        )}

        {analysis && (
          <div data-testid="analysis-result" className="animate-rise nusa-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Hasil Analisis Smart Report</p>
              <AiModeChip provider={analysis.provider === "external" ? "external" : "mock"} />
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Kategori</p>
                  <p data-testid="analysis-category" className="mt-1 font-display text-lg font-semibold">{analysis.category}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Masalah</p>
                  <p data-testid="analysis-issue" className="mt-1 font-display text-lg font-semibold">{analysis.issue}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Tingkat Keparahan</p>
                  <div className="mt-1.5"><SeverityBadge severity={analysis.severity} /></div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Keyakinan AI</p>
                  <p data-testid="analysis-confidence" className="mt-1 font-display text-lg font-semibold">{Math.round(analysis.confidence * 100)}%</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Ringkasan AI</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{analysis.summary}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-[10px] uppercase tracking-wider text-emerald-700">Rekomendasi Tindakan</p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-900">{analysis.recommended_action}</p>
              </div>
              <Badge className="bg-slate-100 text-slate-600">
                <MapPin className="mr-1 h-3 w-3" /> RT {rt} / RW 04 · Desa Sukamaju
              </Badge>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  data-testid="report-submit-btn" onClick={submit} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Kirim Laporan
                </button>
                <button
                  data-testid="report-edit-btn" onClick={() => setAnalysis(null)}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Ubah
                </button>
                <button
                  data-testid="report-cancel-btn" onClick={reset}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="flex items-center gap-1.5 pb-2 text-xs text-slate-400">
          <Upload className="h-3.5 w-3.5" /> Foto disimpan aman di penyimpanan objek NUSA, bukan di peramban Anda.
        </p>
      </div>
    </ResidentLayout>
  );
}
