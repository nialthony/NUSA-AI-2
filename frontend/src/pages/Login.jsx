import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth, homeFor } from "@/context/AuthContext";
import { NusaLogo } from "@/components/Logo";

const DEMO = [
  { role: "Warga", email: "resident@nusa.demo", desc: "Budi Santoso · RT 09", id: "resident" },
  { role: "Admin RT", email: "admin@nusa.demo", desc: "Pengurus RT 09 / RW 04", id: "admin" },
  { role: "Super Admin", email: "superadmin@nusa.demo", desc: "Pengelola platform NUSA", id: "superadmin" },
];

export default function Login() {
  const { user, loading: authLoading, login, startGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) navigate(homeFor(user.role), { replace: true });
    if (new URLSearchParams(location.search).get("oauth") === "success") toast.success("Berhasil masuk dengan Google");
  }, [authLoading, user, navigate, location.search]);

  const submit = async (e, presetEmail) => {
    e?.preventDefault?.();
    const em = presetEmail || email;
    const pw = presetEmail ? "demo123" : password;
    if (!em || !pw) return setError("Email dan kata sandi wajib diisi.");
    setLoading(true); setError("");
    const res = await login(em, pw);
    setLoading(false);
    if (res.ok) { toast.success(`Selamat datang, ${res.user.name}`); navigate(homeFor(res.user.role)); }
    else { setError(res.error); toast.error(res.error); }
  };

  const google = () => { setGoogleLoading(true); startGoogleLogin(); };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story__top"><Link to="/" className="brand-lockup"><NusaLogo className="h-9 w-9" /><span>NUSA</span></Link><span className="auth-kicker">COMMUNITY OPERATING SYSTEM</span></div>
        <div className="auth-story__body">
          <p className="eyebrow eyebrow--light">Selamat datang kembali</p>
          <h1>Keputusan lingkungan yang lebih <em>jelas.</em></h1>
          <p className="auth-story__copy">Satu ruang kerja untuk laporan warga, kas lingkungan, dan tindakan yang bisa dilacak sampai selesai.</p>
          <div className="auth-proof"><div className="proof-icon"><Check /></div><div><strong>Dibuat untuk RT/RW Indonesia</strong><span>Data rapi. Tindakan nyata. Komunikasi tenang.</span></div></div>
        </div>
        <div className="auth-story__footer"><span>RT 09 / RW 04</span><span>Desa Sukamaju, Indonesia</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-mobile-brand"><Link to="/" className="brand-lockup brand-lockup--dark"><NusaLogo className="h-8 w-8" /><span>NUSA</span></Link></div>
          <div className="auth-heading"><p className="eyebrow">Ruang kerja komunitas</p><h2>Masuk ke akun Anda</h2><p>Kelola lingkungan dengan lebih teratur, mulai dari satu laporan.</p></div>
          <button type="button" className="oauth-button" onClick={google} disabled={googleLoading}><span className="google-mark">G</span>{googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lanjutkan dengan Google"}</button>
          <div className="auth-divider"><span>atau gunakan email</span></div>
          <form onSubmit={submit} className="auth-form">
            <label className="field"><span>Email</span><div className="field__control"><Mail /><input data-testid="login-email-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.id" /></div></label>
            <label className="field"><span>Kata sandi</span><div className="field__control"><LockKeyhole /><input data-testid="login-password-input" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" /><button type="button" aria-label="Tampilkan kata sandi" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            {error && <p data-testid="login-error" className="auth-error">{error}</p>}
            <button data-testid="login-submit-btn" type="submit" disabled={loading} className="auth-submit">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Masuk <ArrowRight /></button>
          </form>
          <div className="auth-switch">Belum punya akun? <Link to="/signup">Buat akun gratis <ArrowRight /></Link></div>
          <details className="demo-access"><summary><ShieldCheck /> Akses demo untuk review</summary><div>{DEMO.map((d) => <button key={d.email} onClick={(e) => submit(e, d.email)} disabled={loading}><span><strong>{d.role}</strong><small>{d.email}</small></span><ArrowRight /></button>)}</div></details>
          <p className="auth-legal">Dengan masuk, Anda menyetujui kebijakan penggunaan NUSA untuk komunitas.</p>
        </div>
      </section>
    </main>
  );
}
