import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Camera, Wallet, Users, User, LogOut, Bell, CheckCheck } from "lucide-react";
import { api, tanggal } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/resident", label: "Beranda", icon: Home, id: "home" },
  { to: "/resident/reports", label: "Laporan", icon: Camera, id: "reports" },
  { to: "/resident/finance", label: "Kas", icon: Wallet, id: "finance" },
  { to: "/resident/community", label: "Komunitas", icon: Users, id: "community" },
  { to: "/resident/profile", label: "Profil", icon: User, id: "profile" },
];

export function ResidentLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [notif, setNotif] = useState({ unread: 0, items: [] });
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    api.get("/notifications").then(({ data }) => setNotif(data)).catch(() => {});
  }, []);

  const openNotif = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    setMenu(false);
    if (next && notif.unread > 0) {
      try {
        await api.post("/notifications/read");
        setNotif((n) => ({ unread: 0, items: n.items.map((i) => ({ ...i, read: true })) }));
      } catch {
        /* biarkan badge apa adanya bila gagal */
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link to="/resident" data-testid="resident-logo" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 font-display text-sm font-semibold text-white">N</span>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">NUSA</p>
              <p className="text-[10px] text-slate-500">RT 09 / RW 04 · Desa Sukamaju</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button
              data-testid="resident-bell" onClick={openNotif} aria-label="Notifikasi laporan"
              className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <Bell className="h-4 w-4" />
              {notif.unread > 0 && (
                <span data-testid="notif-badge" className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
                  {notif.unread}
                </span>
              )}
            </button>
            <button
              data-testid="resident-avatar-btn"
              onClick={() => { setMenu((m) => !m); setNotifOpen(false); }}
              aria-label="Menu akun"
              className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 font-display text-xs font-semibold text-emerald-800"
            >
              {(user?.name || "W").charAt(0)}
            </button>
          </div>
        </div>
        {notifOpen && (
          <div data-testid="notif-panel" className="mx-auto max-w-2xl px-5 pb-3">
            <div className="nusa-card max-h-80 overflow-y-auto p-2">
              <p className="flex items-center gap-1.5 px-2 py-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <CheckCheck className="h-3.5 w-3.5" /> Kabar Laporan Anda
              </p>
              {notif.items.length === 0 && (
                <p data-testid="notif-empty" className="px-2 pb-3 text-xs text-slate-500">
                  Belum ada pembaruan status. Kami akan memberi tahu Anda saat pengurus menindaklanjuti laporan.
                </p>
              )}
              {notif.items.map((n, i) => (
                <Link
                  key={n.id} to="/resident/reports" data-testid={`notif-item-${i}`}
                  onClick={() => setNotifOpen(false)}
                  className="block rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{tanggal(n.created_at)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
        {menu && (
          <div data-testid="resident-account-menu" className="mx-auto max-w-2xl px-5 pb-3">
            <div className="nusa-card flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                data-testid="resident-logout-btn"
                onClick={() => { logout(); navigate("/login"); }}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" /> Keluar
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-stretch justify-between px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, id }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                data-testid={`nav-${id}`}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-emerald-700" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.7} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
