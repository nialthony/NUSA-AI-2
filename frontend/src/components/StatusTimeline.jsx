import { Clock } from "lucide-react";
import { STATUS_STYLE } from "@/lib/api";

const DOT = {
  Terkirim: "bg-slate-400",
  Ditinjau: "bg-amber-500",
  Ditangani: "bg-blue-500",
  Selesai: "bg-emerald-500",
  Ditolak: "bg-rose-500",
};

export function StatusTimeline({ events = [], testId = "status-timeline" }) {
  if (events.length === 0) {
    return <p className="text-xs text-slate-400">Belum ada riwayat status untuk laporan ini.</p>;
  }
  return (
    <ol data-testid={testId} className="relative space-y-4 pl-5">
      <span className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" aria-hidden="true" />
      {events.map((e, i) => (
        <li key={i} data-testid={`${testId}-item-${i}`} className="relative">
          <span className={`absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${DOT[e.to_status] || "bg-slate-400"}`} />
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[e.to_status] || "bg-slate-100 text-slate-700"}`}>
              {e.to_status}
            </span>
            {e.from_status && <span className="text-[11px] text-slate-400">dari {e.from_status}</span>}
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              {new Date(e.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{e.note}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Diperbarui oleh {e.changed_by}</p>
        </li>
      ))}
    </ol>
  );
}
