import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth, homeFor } from "@/context/AuthContext";
import { NusaLogo } from "@/components/Logo";

export default function Signup() {
  const { user, loading: authLoading, signup, startGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!authLoading && user) navigate(homeFor(user.role), { replace: true }); }, [authLoading, user, navigate]);
  const update = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (form.password !== form.confirm) return setError("Konfirmasi kata sandi belum sama.");
    if (!terms) return setError("Setujui syarat penggunaan untuk melanjutkan.");
    setLoading(true);
    const res = await signup(form);
    setLoading(false);
    if (res.ok) { toast.success("Akun berhasil dibuat"); navigate(homeFor(res.user.role)); }
    else { setError(res.error); toast.error(res.error); }
  };
  const google = () => { setGoogleLoading(true); startGoogleLogin(); };
  return (
    <main className="auth-page auth-page--signup">
      <section className="auth-story auth-story--signup"><div className="auth-story__top"><Link to="/" className="brand-lockup"><NusaLogo className="h-9 w-9" /><span>NUSA</span></Link><span className="auth-kicker">COMMUNITY OPERATING SYSTEM</span></div><div className="auth-story__body"><p className="eyebrow eyebrow--light">Mulai dari satu lingkungan</p><h1>Ruang yang membuat warga <em>terhubung.</em></h1><p className="auth-story__copy">Buat akun warga untuk menyampaikan laporan, mengikuti progres, dan melihat transparansi lingkungan.</p><div className="auth-benefits"><span><Check /> Laporan lebih mudah dilacak</span><span><Check /> Informasi kas lebih transparan</span><span><Check /> Komunikasi tidak tenggelam</span></div></div><div className="auth-story__footer"><span>Gratis untuk memulai</span><span>Data Anda tetap milik komunitas</span></div></section>
      <section className="auth-panel"><div className="auth-panel__inner"><div className="auth-mobile-brand"><Link to="/" className="brand-lockup brand-lockup--dark"><NusaLogo className="h-8 w-8" /><span>NUSA</span></Link></div><div className="auth-heading"><p className="eyebrow">Pendaftaran warga</p><h2>Buat akun Anda</h2><p>Bergabung dengan ruang kerja komunitas yang lebih rapi.</p></div><button type="button" className="oauth-button" onClick={google} disabled={googleLoading}><span className="google-mark">G</span>{googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Daftar dengan Google"}</button><div className="auth-divider"><span>atau daftar dengan email</span></div><form onSubmit={submit} className="auth-form"><label className="field"><span>Nama lengkap</span><div className="field__control"><UserRound /><input autoComplete="name" value={form.name} onChange={update("name")} placeholder="Nama Anda" required /></div></label><label className="field"><span>Email</span><div className="field__control"><Mail /><input type="email" autoComplete="email" value={form.email} onChange={update("email")} placeholder="nama@contoh.id" required /></div></label><label className="field"><span>Nomor WhatsApp <small>opsional</small></span><div className="field__control"><Phone /><input type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} placeholder="08xx xxxx xxxx" /></div></label><label className="field"><span>Kata sandi</span><div className="field__control"><LockKeyhole /><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={update("password")} placeholder="Minimal 8 karakter" required /><button type="button" aria-label="Tampilkan kata sandi" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label><label className="field"><span>Ulangi kata sandi</span><div className="field__control"><LockKeyhole /><input type="password" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} placeholder="Ketik ulang kata sandi" required /></div></label>{error && <p className="auth-error">{error}</p>}<label className="terms-check"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>Saya menyetujui syarat penggunaan dan kebijakan privasi NUSA.</span></label><button type="submit" disabled={loading} className="auth-submit">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Buat akun <ArrowRight /></button></form><div className="auth-switch">Sudah punya akun? <Link to="/login">Masuk sekarang <ArrowRight /></Link></div><p className="auth-legal">Akun baru dibuat sebagai Warga. Peran pengurus dapat diberikan oleh administrator komunitas.</p></div></section>
    </main>
  );
}
