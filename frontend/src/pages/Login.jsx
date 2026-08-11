import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useAuth, homeFor } from "@/context/AuthContext";

const DEMO = [
  { role: "Warga", email: "resident@nusa.demo", desc: "Budi Santoso · RT 09", id: "resident" },
  { role: "Admin RT", email: "admin@nusa.demo", desc: "Pengurus RT 09 / RW 04", id: "admin" },
  { role: "Super Admin", email: "superadmin@nusa.demo", desc: "Pengelola platform NUSA", id: "superadmin" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e, presetEmail) => {
    e?.preventDefault?.();
    const em = presetEmail || email;
    const pw = presetEmail ? "demo123" : password;
    if (!em || !pw) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await login(em, pw);
    setLoading(false);
    if (res.ok) {
      toast.success(`Selamat datang, ${res.user.name}`);
      navigate(homeFor(res.user.role));
    } else {
      setError(res.error);
      toast.error(res.error);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <Link to="/" data-testid="login-logo" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white font-display text-sm font-semibold text-slate-900">N</span>
          <span className="font-display text-lg font-semibold tracking-tight">NUSA</span>
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">AI Community Operating System</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight">
            Lingkungan Anda punya data. NUSA mengubahnya jadi intelijen.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
            Masuk dengan salah satu akun demo untuk menjelajahi Command Center pengurus RT, Smart Report warga,
            dan asisten NUSA AI.
          </p>
        </div>
        <p className="text-xs text-slate-400">RT 09 / RW 04 — Desa Sukamaju, Indonesia</p>
      </div>

      <div className="flex min-h-screen flex-col justify-center bg-[#FAFAFA] px-6 py-12 lg:px-16">
        <Link data-testid="login-back-link" to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 lg:hidden">
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>
        <div className="mx-auto w-full max-w-md">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Masuk ke NUSA</h2>
          <p className="mt-2 text-sm text-slate-500">Gunakan akun demo di bawah atau kredensial Anda.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</label>
              <input
                id="email" data-testid="login-email-input" type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)} placeholder="nama@nusa.demo"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-slate-500">Kata Sandi</label>
              <input
                id="password" data-testid="login-password-input" type="password" value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)} placeholder="demo123"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            {error && <p data-testid="login-error" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <button
              data-testid="login-submit-btn" type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Masuk
            </button>
          </form>

          <div className="mt-9">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Akun Demo · kata sandi demo123
            </p>
            <div className="mt-3 space-y-2.5">
              {DEMO.map((d) => (
                <div key={d.email} className="nusa-card flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{d.role}</p>
                    <p className="truncate text-xs text-slate-500">{d.email} · {d.desc}</p>
                  </div>
                  <button
                    data-testid={`demo-login-${d.id}`}
                    onClick={(e) => submit(e, d.email)}
                    disabled={loading}
                    className="shrink-0 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                  >
                    Masuk Demo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
