import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, errText, tanggal } from "@/lib/api";
import { Badge, Skeleton, ErrorBox, SectionTitle } from "@/components/Shared";

const SEV_COLOR = { HIGH: "#EF4444", MEDIUM: "#F59E0B", LOW: "#10B981" };
const SEV_RADIUS = { HIGH: 11, MEDIUM: 9, LOW: 7 };

export function ReportMap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [severity, setSeverity] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const load = () => {
    setErr("");
    api.get("/reports/map").then(({ data }) => setData(data)).catch((e) => setErr(errText(e)));
  };

  useEffect(load, []);

  const points = useMemo(() => {
    if (!data) return [];
    return data.points.filter(
      (p) => (!severity || p.severity === severity) && (!onlyOpen || p.status !== "Selesai")
    );
  }, [data, severity, onlyOpen]);

  useEffect(() => {
    if (!data || !holderRef.current || mapRef.current) return;
    const map = L.map(holderRef.current, { scrollWheelZoom: false })
      .setView([data.center.lat, data.center.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    points.forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: SEV_RADIUS[p.severity] || 8,
        color: SEV_COLOR[p.severity] || "#64748B",
        fillColor: SEV_COLOR[p.severity] || "#64748B",
        fillOpacity: p.status === "Selesai" ? 0.25 : 0.7,
        weight: 1.5,
      })
        .bindPopup(
          `<strong>${p.title}</strong><br/><span style="color:#64748B;font-size:11px">${p.category} · RT ${p.rt} · ${tanggal(p.created_at)}</span><br/><span style="font-size:11px">${p.severity} · ${p.status}</span>`
        )
        .addTo(layer);
    });
  }, [points]);

  const focusRt = (h) => {
    mapRef.current?.setView([h.lat, h.lng], 16, { animate: true });
    holderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!data) return <Skeleton className="h-96" />;

  return (
    <div data-testid="report-map-card" className="nusa-card p-6">
      <SectionTitle
        overline="Sebaran Lapangan"
        title="Peta Titik Masalah"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              data-testid="map-severity-filter" aria-label="Filter tingkat keparahan" value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-400"
            >
              <option value="">Semua tingkat</option>
              {["HIGH", "MEDIUM", "LOW"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              data-testid="map-open-toggle" onClick={() => setOnlyOpen((o) => !o)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                onlyOpen ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Hanya belum selesai
            </button>
          </div>
        }
      />

      <div ref={holderRef} data-testid="report-map" className="h-[380px] w-full overflow-hidden rounded-xl border border-slate-200" />

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        {Object.entries(SEV_COLOR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {k}
          </span>
        ))}
        <span data-testid="map-point-count" className="text-slate-400">Titik pudar = sudah selesai · {points.length} titik ditampilkan</span>
      </div>

      <div className="mt-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Titik Rawan per RT</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.hotspots.map((h, i) => (
            <button
              key={h.rt}
              data-testid={`hotspot-${i}`}
              onClick={() => focusRt(h)}
              className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-semibold">RT {h.rt}</p>
                {h.urgent > 0 && <Badge className="bg-rose-100 text-rose-700">{h.urgent} mendesak</Badge>}
              </div>
              <p className="mt-2 text-xs text-slate-500">{h.total} laporan · {h.open} belum selesai</p>
              <p className="mt-1 text-[11px] text-emerald-700">Lihat di peta →</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
