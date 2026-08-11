import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Users, Wallet, ChartBar, Sparkles, FileBarChart, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NusaLogo } from "@/components/Logo";
import { ThemeToggle } from "@/components/Shared";

const NAV = [
  { to: "/admin", label: "Command Center", icon: LayoutDashboard, id: "dashboard" },
  { to: "/admin/reports", label: "Laporan Warga", icon: FileText, id: "reports" },
  { to: "/admin/residents", label: "Data Warga", icon: Users, id: "residents" },
  { to: "/admin/finance", label: "Kas Warga", icon: Wallet, id: "finance" },
  { to: "/admin/analytics", label: "Analitik", icon: ChartBar, id: "analytics" },
  { to: "/admin/ai", label: "NUSA AI", icon: Sparkles, id: "ai" },
  { to: "/admin/reports/monthly", label: "Laporan Bulanan", icon: FileBarChart, id: "monthly" },
];

export function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, id }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            data-testid={`admin-nav-${id}`}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.9} /> {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
        <Link to="/admin" data-testid="admin-logo" className="mb-8 flex items-center gap-2.5">
          <NusaLogo className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-display text-base font-semibold tracking-tight">NUSA</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Command Center</p>
          </div>
        </Link>
        {links}
        <div className="mt-auto space-y-3 pt-6">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="admin-logout-btn"
              onClick={() => { logout(); navigate("/login"); }}
              className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <span className="flex items-center gap-2 font-display font-semibold">
          <NusaLogo className="h-7 w-7" /> NUSA Admin
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle className="h-8 w-8" />
          <button data-testid="admin-menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 hover:bg-slate-100">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
      {open && <div className="border-b border-slate-200 bg-white p-4 lg:hidden">{links}</div>}

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
