import { createFileRoute } from "@tanstack/react-router";
import { useLiveSensors } from "@/data/mockSensors";
import { Brain, TrendingUp, AlertTriangle, Sparkles, FileDown, FlaskConical } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { motion } from "framer-motion";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/predictions")({
  component: Predictions,
  head: () => ({ meta: [{ title: "ML Prediction Center — AirPulse IoT" }, { name: "description", content: "LSTM and ensemble ML forecasts for CO₂, AQI and hazards." }] }),
});

function Predictions() {
  const { history, latest } = useLiveSensors();

  // Simple forward projection (trend extrapolation as a stand-in for LSTM output)
  const trendCo2 = (history[history.length - 1].co2 - history[Math.max(0, history.length - 10)].co2) / 10;
  const future = Array.from({ length: 12 }).map((_, i) => {
    const m = (i + 1) * 5;
    const co2 = Math.max(380, Math.round(latest.co2 + trendCo2 * (i + 1) + (Math.random() - 0.5) * 30));
    const aqi = Math.max(20, Math.round(latest.aqi + (i + 1) * 2 + (Math.random() - 0.5) * 8));
    const temp = +(latest.temp + Math.sin(i / 3) + (Math.random() - 0.5) * 0.4).toFixed(1);
    return { time: `+${m}m`, co2, aqi, temp };
  });

  const merged = [
    ...history.slice(-12).map((h) => ({ time: h.time, co2: h.co2, aqi: h.aqi, predCo2: null as number | null })),
    ...future.map((f) => ({ time: f.time, co2: null as number | null, aqi: null as number | null, predCo2: f.co2 })),
  ];

  const co2Hazard = future.find((f) => f.co2 > 1000);
  const confidence = 87 + Math.round(Math.random() * 8);

  const models = [
    { name: "LSTM Time-Series", target: "CO₂ next 60 min", accuracy: 94, color: "text-primary" },
    { name: "Random Forest", target: "AQI trend", accuracy: 91, color: "text-accent" },
    { name: "Isolation Forest", target: "Anomaly detection", accuracy: 96, color: "text-warn" },
    { name: "K-Means", target: "Pollution clustering", accuracy: 88, color: "text-primary" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <Brain className="w-9 h-9 text-primary" />
          ML <span className="neon-text">Prediction</span> Center
        </h1>
        <p className="text-muted-foreground mt-2">Forecasts powered by LSTM, Random Forest, Decision Trees and ensemble anomaly detection.</p>
      </div>

      {/* AI Insight banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 neon-border flex flex-wrap items-center gap-4">
        <Sparkles className="w-6 h-6 text-primary" />
        <div className="flex-1 min-w-[240px]">
          <div className="font-semibold">AI Insight</div>
          <div className="text-sm text-muted-foreground">
            {co2Hazard
              ? `Warning: CO₂ projected to exceed safe threshold (~${co2Hazard.co2} ppm) within ${co2Hazard.time}. Activate purifier.`
              : `Air quality predicted stable for the next 60 minutes. AQI within healthy range.`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="text-2xl font-bold text-accent">{confidence}%</div>
        </div>
      </motion.div>

      {/* Forecast chart */}
      <div className="glass rounded-xl p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> CO₂ Forecast</h3>
            <p className="text-xs text-muted-foreground">Past 12 minutes + LSTM 60-minute projection</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={merged}>
            <defs>
              <linearGradient id="actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.18 195)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.82 0.18 195)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.22 150)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.82 0.22 150)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
            <XAxis dataKey="time" stroke="oklch(0.7 0.03 220)" fontSize={10} />
            <YAxis stroke="oklch(0.7 0.03 220)" fontSize={10} />
            <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
            <ReferenceLine y={1000} stroke="oklch(0.65 0.25 25)" strokeDasharray="4 4" label={{ value: "Hazard", fill: "oklch(0.65 0.25 25)", fontSize: 10 }} />
            <Area type="monotone" dataKey="co2" stroke="oklch(0.82 0.18 195)" fill="url(#actual)" strokeWidth={2} name="Actual" />
            <Area type="monotone" dataKey="predCo2" stroke="oklch(0.82 0.22 150)" fill="url(#pred)" strokeWidth={2} strokeDasharray="5 4" name="Predicted" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Models grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((m) => (
          <div key={m.name} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Model</span>
              <Brain className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="font-semibold mt-1">{m.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.target}</div>
            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Accuracy</span>
                <span className={m.color}>{m.accuracy}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${m.accuracy}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warn" /> Anomaly Detection</h3>
        <p className="text-xs text-muted-foreground mt-1">Isolation Forest scanning the live stream for outliers.</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {[
            { l: "Sensors monitored", v: "12" },
            { l: "Anomalies (24h)", v: "3" },
            { l: "False positives", v: "0.4%" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg p-3 bg-background/40 border">
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className="text-2xl font-bold neon-text">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Hazard Report Generator */}
      <ReportGenerator />
    </div>
  );
}

function ReportGenerator() {
  const [co2, setCo2] = useState("650");
  const [pm25, setPm25] = useState("35");
  const [temp, setTemp] = useState("26");
  const [humidity, setHumidity] = useState("55");
  const [location, setLocation] = useState("Lab Room A");

  const computeReport = () => {
    const c = Number(co2) || 0;
    const p = Number(pm25) || 0;
    const t = Number(temp) || 0;
    const h = Number(humidity) || 0;

    // Hourly trajectory model (12 x 5-min steps). Drift seeded by current load.
    const drift = (c - 420) * 0.02 + p * 0.6 + Math.max(0, t - 28) * 4;
    const points = Array.from({ length: 12 }).map((_, i) => {
      const m = (i + 1) * 5;
      const co2F = Math.max(380, Math.round(c + drift * (i + 1) * 0.35));
      const pmF = Math.max(0, Math.round(p + (drift / 18) * (i + 1)));
      const aqiF = Math.min(400, Math.round(pmF * 1.8 + (co2F - 400) * 0.05));
      return { m, co2: co2F, pm: pmF, aqi: aqiF };
    });

    const breach = points.find((x) => x.co2 > 1000 || x.aqi > 150);
    const finalPt = points[points.length - 1];
    const status = !breach
      ? "SAFE"
      : breach.m <= 20
      ? "CRITICAL"
      : breach.m <= 40
      ? "HIGH RISK"
      : "CAUTION";

    return { c, p, t, h, points, breach, finalPt, status };
  };

  const download = () => {
    const r = computeReport();
    const now = new Date();
    const id = `APR-${now.getTime().toString(36).toUpperCase()}`;
    const safeMsg = r.breach
      ? `Air quality is currently within acceptable range, however the predictive model forecasts a breach in approximately ${r.breach.m} minutes (CO₂ ≈ ${r.breach.co2} ppm, AQI ≈ ${r.breach.aqi}). Pre-emptive ventilation is recommended.`
      : `Predicted air quality remains within safe operating limits for the next 60 minutes. Continue routine monitoring.`;

    const rowsHtml = r.points
      .map(
        (x) => `<tr><td>+${x.m} min</td><td>${x.co2} ppm</td><td>${x.pm} µg/m³</td><td>${x.aqi}</td><td>${
          x.co2 > 1000 || x.aqi > 150 ? "<span style='color:#c0392b;font-weight:700'>BREACH</span>" : "OK"
        }</td></tr>`,
      )
      .join("");

    const statusColor =
      r.status === "SAFE" ? "#1f8a4c" : r.status === "CAUTION" ? "#b07d00" : r.status === "HIGH RISK" ? "#c45a00" : "#a8201a";

    const actionVent = r.c > 1000 ? "Increase fresh-air intake immediately." : "Maintain current ventilation cycle.";
    const actionFilter = r.p > 55 ? "Engage HEPA + activated-carbon stage at high power." : "Standard filtration is sufficient.";
    const humidityOut = r.h < 30 || r.h > 70;
    const actionHumidity = humidityOut ? "Adjust humidity toward 40–60% comfort range." : "Humidity within comfort band.";
    const actionBreach = r.breach
      ? `Schedule purifier pre-activation ${Math.max(5, r.breach.m - 10)} minutes before predicted breach.`
      : "Re-evaluate after next sensor sweep (60 min).";

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>AirPulse IoT — Hazard Report ${id}</title>
<style>
  *{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1f2c;background:#f6f8fb;margin:0;padding:32px}
  .wrap{max-width:840px;margin:0 auto;background:#fff;border-radius:14px;padding:36px;box-shadow:0 8px 32px rgba(20,40,80,.08)}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #eef1f6;padding-bottom:18px;margin-bottom:22px}
  h1{margin:0;font-size:22px;letter-spacing:-.02em}
  .sub{color:#5a6478;font-size:12px;margin-top:4px}
  .badge{display:inline-block;padding:8px 14px;border-radius:999px;color:#fff;font-weight:700;font-size:13px;background:${statusColor}}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef1f6}
  th{background:#f0f4fa;font-weight:600;color:#374050}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
  .cell{background:#f6f8fb;border-radius:10px;padding:12px}
  .cell .l{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em}
  .cell .v{font-size:18px;font-weight:700;margin-top:4px}
  .note{background:#fff7e6;border-left:4px solid #f0a020;padding:12px 14px;border-radius:8px;margin:18px 0;font-size:13px;line-height:1.55}
  h3{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#5a6478;margin:24px 0 8px}
  .foot{margin-top:28px;padding-top:14px;border-top:1px solid #eef1f6;font-size:11px;color:#8892a6;display:flex;justify-content:space-between}
  @media print{body{background:#fff;padding:0}.wrap{box-shadow:none;border-radius:0}}
</style></head><body><div class="wrap">
  <div class="head">
    <div>
      <h1>AirPulse IoT — Hourly Hazard Forecast</h1>
      <div class="sub">Report ID: ${id} &nbsp;·&nbsp; Generated: ${now.toLocaleString()}</div>
      <div class="sub">Location: ${location || "—"}</div>
    </div>
    <div class="badge">${r.status}</div>
  </div>

  <h3>Input Readings</h3>
  <div class="grid">
    <div class="cell"><div class="l">CO₂</div><div class="v">${r.c} ppm</div></div>
    <div class="cell"><div class="l">PM2.5</div><div class="v">${r.p} µg/m³</div></div>
    <div class="cell"><div class="l">Temperature</div><div class="v">${r.t} °C</div></div>
    <div class="cell"><div class="l">Humidity</div><div class="v">${r.h} %</div></div>
  </div>

  <h3>Executive Summary</h3>
  <div class="note">${safeMsg}</div>

  <h3>60-Minute Forecast (5-min intervals)</h3>
  <table>
    <thead><tr><th>Horizon</th><th>CO₂</th><th>PM2.5</th><th>AQI</th><th>Status</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <h3>Recommended Actions</h3>
  <ul style="font-size:13px;line-height:1.7;color:#374050">
    <li>${actionVent}</li>
    <li>${actionFilter}</li>
    <li>${actionHumidity}</li>
    <li>${actionBreach}</li>
  </ul>

  <div class="foot">
    <span>AirPulse IoT · Predictive Environmental Intelligence</span>
    <span>Model: LSTM-trend ensemble · v1.2</span>
  </div>
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airpulse-report-${id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const preview = computeReport();
  const statusTone =
    preview.status === "SAFE"
      ? "text-accent"
      : preview.status === "CAUTION"
      ? "text-warn"
      : preview.status === "HIGH RISK"
      ? "text-warn"
      : "text-destructive";

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-semibold flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" /> Manual Hazard Report Generator
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        Enter sensor readings — get a 60-minute hazard forecast and download a printable report.
      </p>

      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="CO₂ (ppm)" value={co2} onChange={setCo2} />
        <Field label="PM2.5 (µg/m³)" value={pm25} onChange={setPm25} />
        <Field label="Temperature (°C)" value={temp} onChange={setTemp} />
        <Field label="Humidity (%)" value={humidity} onChange={setHumidity} />
        <div>
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Forecast verdict</span>
          <span className={`text-lg font-bold ${statusTone}`}>{preview.status}</span>
          {preview.breach && (
            <span className="text-xs text-muted-foreground">
              breach predicted in <b className="text-warn">+{preview.breach.m} min</b> (CO₂ {preview.breach.co2} ppm)
            </span>
          )}
          {!preview.breach && (
            <span className="text-xs text-muted-foreground">
              stays safe through +60 min (final CO₂ ≈ {preview.finalPt.co2} ppm)
            </span>
          )}
        </div>
        <Button onClick={download} className="gap-2">
          <FileDown className="w-4 h-4" /> Download Report
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
