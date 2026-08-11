import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nusa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errText(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Terjadi kesalahan. Coba lagi.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return String(d);
}

export const rupiah = (v) =>
  "Rp " + Math.round(Math.abs(v || 0)).toLocaleString("id-ID");

export const tanggal = (iso) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const bulanLabel = (m) => {
  const [y, mm] = m.split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
};

export const STATUS_STYLE = {
  Terkirim: "bg-slate-100 text-slate-700",
  Ditinjau: "bg-amber-100 text-amber-800",
  Ditangani: "bg-blue-100 text-blue-800",
  Selesai: "bg-emerald-100 text-emerald-800",
  Ditolak: "bg-rose-100 text-rose-800",
};

export const SEVERITY_STYLE = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-slate-100 text-slate-600",
};

export const KATEGORI = ["Infrastruktur", "Sampah", "Penerangan", "Drainase", "Keamanan", "Lingkungan", "Lainnya"];
export const KATEGORI_KAS = ["Iuran Warga", "Infrastruktur", "Kebersihan", "Keamanan", "Kegiatan", "Utilitas", "Bantuan Sosial", "Lainnya"];
