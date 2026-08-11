import { Loader2, Sparkles, TrendingUp, TriangleAlert, Info, CheckCircle2, Sun, Moon } from "lucide-react";
import { STATUS_STYLE, SEVERITY_STYLE } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export const ThemeToggle = ({ className = "" }) => {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      data-testid="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      className={`grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export const Badge = ({ children, className = "", testId }) => (
  <span data-testid={testId} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

export const StatusBadge = ({ status }) => (
  <Badge className={STATUS_STYLE[status] || "bg-slate-100 text-slate-700"}>{status}</Badge>
);

export const SeverityBadge = ({ severity }) => (
  <Badge className={SEVERITY_STYLE[severity] || "bg-slate-100"}>{severity}</Badge>
);

export const Stat = ({ label, value, sub, icon: Icon, testId, accent = false }) => (
  <div data-testid={testId} className="nusa-card p-5 transition-transform duration-200 hover:-translate-y-0.5">
    <div className="flex items-start justify-between">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      {Icon && <Icon className={`h-4 w-4 ${accent ? "text-emerald-600" : "text-slate-300"}`} strokeWidth={1.8} />}
    </div>
    <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
  </div>
);

export const Loading = ({ label = "Memuat data komunitas..." }) => (
  <div data-testid="loading-state" className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    <p className="text-sm">{label}</p>
  </div>
);

export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

export const Empty = ({ title, hint, action, testId = "empty-state" }) => (
  <div data-testid={testId} className="nusa-card flex flex-col items-center gap-2 px-6 py-14 text-center">
    <div className="rounded-full bg-emerald-50 p-3">
      <Sparkles className="h-5 w-5 text-emerald-600" />
    </div>
    <p className="font-display text-lg font-semibold">{title}</p>
    {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
    {action}
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div data-testid="error-state" className="nusa-card border-rose-200 bg-rose-50/60 p-6">
    <p className="flex items-center gap-2 font-medium text-rose-800">
      <TriangleAlert className="h-4 w-4" /> {message}
    </p>
    {onRetry && (
      <button data-testid="retry-btn" onClick={onRetry} className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-700">
        Coba lagi
      </button>
    )}
  </div>
);

export const AiModeChip = ({ provider }) => (
  <Badge testId="ai-mode-chip" className={provider === "external" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>
    <Sparkles className="mr-1 h-3 w-3" /> {provider === "external" ? "NUSA AI Aktif" : "AI Demo Mode"}
  </Badge>
);

export function PulseGauge({ score, status, size = 168 }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div data-testid="pulse-gauge" className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-3 animate-pulse-ring rounded-full bg-emerald-100" />
      <svg width={size} height={size} className="relative -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth="10" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="#10B981" strokeWidth="10" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-testid="pulse-score" className="font-display text-4xl font-semibold tracking-tight">{score}</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-700">{status}</span>
      </div>
    </div>
  );
}

const INSIGHT_ICON = { warning: TriangleAlert, positive: CheckCircle2, info: Info };
const INSIGHT_TONE = {
  warning: "border-amber-200 bg-amber-50/70 text-amber-900",
  positive: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
  info: "border-slate-200 bg-slate-50 text-slate-800",
};

export function InsightCard({ insight, index = 0 }) {
  const Icon = INSIGHT_ICON[insight.type] || Info;
  return (
    <div
      data-testid={`insight-card-${index}`}
      className={`animate-rise rounded-xl border p-5 ${INSIGHT_TONE[insight.type] || INSIGHT_TONE.info}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <div className="space-y-1.5">
          <p className="font-display text-base font-semibold leading-snug">{insight.title}</p>
          <p className="text-sm leading-relaxed opacity-90">{insight.detail}</p>
          <p className="text-sm font-medium">Rekomendasi: {insight.action}</p>
          <Badge className="bg-white/70 text-[10px] uppercase tracking-wider">Sumber: {insight.source}</Badge>
        </div>
      </div>
    </div>
  );
}

export const SectionTitle = ({ overline, title, right }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      {overline && <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{overline}</p>}
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
    </div>
    {right}
  </div>
);

export const TrendPill = ({ value }) => (
  <Badge className={value >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
    <TrendingUp className="mr-1 h-3 w-3" /> {value >= 0 ? "+" : ""}{value}%
  </Badge>
);
