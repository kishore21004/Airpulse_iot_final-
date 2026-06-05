import { createFileRoute } from "@tanstack/react-router";
import { useLiveSensors } from "@/data/mockSensors";
import { Wind, Power, Zap, AlertTriangle, TrendingUp, Brain, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import purifier from "@/assets/purifier.jpg";
import { useMemo } from "react";

export const Route = createFileRoute("/purification")({
  component: Purification,
  head: () => ({ meta: [{ title: "Smart Purification — AirPulse IoT" }, { name: "description", content: "Adaptive air purification with AI-optimized fan speed and oxygen flow." }] }),
});

function Purification() {
  const { history, latest } = useLiveSensors();
  const pollution = Math.min(100, Math.round((latest.aqi / 200) * 100 + latest.co2 / 30));
  const efficiency = Math.max(60, 100 - Math.round(pollution / 4));
  const oxygen = Math.min(100, 100 - pollution + 20);
  const isActive = pollution > 35;

  // 60-min linear-regression forecast on the last 20 samples (slope * 60 + last)
  const forecast = useMemo(() => {
    const pts = history.slice(-20);
    const n = pts.length || 1;
    const xs = pts.map((_, i) => i);
    const co2s = pts.map((p) => p.co2);
    const aqis = pts.map((p) => p.aqi);
    const slope = (arr: number[]) => {
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = arr.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((s, x, i) => s + (x - mx) * (arr[i] - my), 0);
      const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1;
      return num / den;
    };
    const co2Slope = slope(co2s);
    const aqiSlope = slope(aqis);
    // sample interval ~2.5s, so 60 min ≈ 1440 future steps; cap drift for realism
    const horizon = 24;
    const co2Future = Math.round(Math.max(380, Math.min(1800, latest.co2 + co2Slope * horizon)));
    const aqiFuture = Math.round(Math.max(10, Math.min(380, latest.aqi + aqiSlope * horizon)));
    const delta = co2Future - latest.co2;
    const confidence = Math.min(99, 70 + Math.round(Math.abs(co2Slope) * 4));
    let level: "Safe" | "Caution" | "High Risk" | "Critical" = "Safe";
    if (co2Future > 1200 || aqiFuture > 200) level = "Critical";
    else if (co2Future > 900 || aqiFuture > 140) level = "High Risk";
    else if (co2Future > 700 || aqiFuture > 100) level = "Caution";
    const minsToHazard = co2Slope > 0.5 ? Math.max(5, Math.round((1000 - latest.co2) / (co2Slope * 24) * 60)) : null;
    return { co2Future, aqiFuture, delta, level, confidence, minsToHazard, co2Slope };
  }, [history, latest]);

  const levelColor =
    forecast.level === "Critical" ? "text-destructive"
    : forecast.level === "High Risk" ? "text-warn"
    : forecast.level === "Caution" ? "text-warn"
    : "text-accent";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <Wind className="w-9 h-9 text-primary" />
          Smart <span className="neon-text">Air Purification</span>
        </h1>
        <p className="text-muted-foreground mt-2">Self-learning purifier that adapts to live pollution patterns.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <img src={purifier} alt="Smart air purifier" loading="lazy" width={1024} height={1024} className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Purifier Status</div>
                <div className={`text-2xl font-bold mt-1 ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                  {isActive ? "ACTIVE" : "STANDBY"}
                </div>
              </div>
              <motion.div
                animate={{ rotate: isActive ? 360 : 0 }}
                transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                className="w-24 h-24 rounded-full neon-border flex items-center justify-center bg-background/60"
              >
                <Power className={`w-10 h-10 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
              </motion.div>
            </div>

            <div className="mt-8 space-y-4">
              <Bar label="Purification Efficiency" value={efficiency} unit="%" color="accent" />
              <Bar label="Oxygen Flow" value={oxygen} unit="%" color="primary" />
              <Bar label="CO₂ Absorption" value={Math.min(100, latest.co2 / 14)} unit="%" color="accent" />
            </div>
          </div>
        </div>

        {/* Particle simulation */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden min-h-[420px]">
          <h3 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> Live Airflow Simulation</h3>
          <p className="text-xs text-muted-foreground">Polluted particles being cycled through HEPA + activated carbon stage.</p>

          <div className="absolute inset-x-0 bottom-0 h-72">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                className="absolute bottom-0 w-2 h-2 rounded-full float-particle"
                style={{
                  left: `${(i * 7 + Math.random() * 5) % 100}%`,
                  background: i % 3 === 0 ? "oklch(0.82 0.22 150)" : "oklch(0.82 0.18 195)",
                  animationDelay: `${(i * 0.1).toFixed(2)}s`,
                  animationDuration: `${2 + (i % 4) * 0.5}s`,
                  boxShadow: "0 0 12px currentColor",
                }}
              />
            ))}
          </div>

          <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
            <Mini label="Particles in" value={pollution} />
            <Mini label="Filtered" value={Math.round(pollution * (efficiency / 100))} />
            <Mini label="Clean out" value={Math.max(0, pollution - Math.round(pollution * (efficiency / 100)))} />
          </div>
        </div>
      </div>


      {/* 1-Hour AI Forecast — Hazard Prediction */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              1-Hour Hazard Forecast
              <span className="text-[10px] px-2 py-0.5 rounded-full neon-border ml-2">LSTM · Edge Inference</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Predictive model trained on rolling sensor windows. Pre-cools filters before pollution peaks.
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full neon-border ${levelColor}`}>
            {forecast.level === "Safe" ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm font-bold">{forecast.level}</span>
          </div>
        </div>

        <div className="mt-5 grid md:grid-cols-4 gap-3">
          <ForecastTile label="Now CO₂" value={`${latest.co2}`} unit="ppm" />
          <ForecastTile label="In 60 min" value={`${forecast.co2Future}`} unit="ppm" highlight />
          <ForecastTile label="Δ Trend" value={`${forecast.delta >= 0 ? "+" : ""}${forecast.delta}`} unit="ppm" />
          <ForecastTile label="Confidence" value={`${forecast.confidence}`} unit="%" />
        </div>

        <div className="mt-5 p-4 rounded-xl bg-background/40 border border-border/40">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="font-semibold">AI Insight:</span>
            <span className="text-muted-foreground">
              {forecast.level === "Safe" && "Air quality is projected to remain within safe limits for the next hour."}
              {forecast.level === "Caution" && `CO₂ trending up — expected to reach ${forecast.co2Future} ppm within 60 min. Boosting filter cycle.`}
              {forecast.level === "High Risk" && `High CO₂ emission risk in ~${forecast.minsToHazard ?? 45} min. Auto-engaging deep purification.`}
              {forecast.level === "Critical" && `Critical hazard predicted within the hour (CO₂ ${forecast.co2Future} ppm). Ventilation override triggered.`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-12 gap-1 h-16 items-end">
            {Array.from({ length: 12 }).map((_, i) => {
              const t = (i + 1) / 12;
              const v = latest.co2 + (forecast.co2Future - latest.co2) * t;
              const h = Math.min(100, Math.max(8, ((v - 380) / 1000) * 100));
              const danger = v > 1000;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${h}%`,
                      background: danger
                        ? "linear-gradient(to top, oklch(0.65 0.25 25), oklch(0.85 0.18 80))"
                        : "linear-gradient(to top, oklch(0.82 0.18 195 / 0.6), oklch(0.82 0.22 150 / 0.8))",
                      boxShadow: danger ? "0 0 8px oklch(0.65 0.25 25)" : "none",
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground">+{(i + 1) * 5}m</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Innovation: Bio-Carbon Filter Health & Auto-Vent Bridge */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="text-xs uppercase text-muted-foreground">Bio-Carbon Filter Life</div>
          <div className="text-3xl font-bold neon-text mt-1">{Math.max(12, 100 - Math.round(pollution * 0.6))}%</div>
          <p className="text-xs text-muted-foreground mt-2">Algae-infused HEPA stage — regenerates O₂ from absorbed CO₂.</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="text-xs uppercase text-muted-foreground">Auto-Vent Bridge</div>
          <div className="text-3xl font-bold mt-1 text-accent">{forecast.level === "Critical" ? "OPEN" : "AUTO"}</div>
          <p className="text-xs text-muted-foreground mt-2">Cross-room mesh sync — redirects clean air to high-occupancy zones.</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="text-xs uppercase text-muted-foreground">Solar-Assist Mode</div>
          <div className="text-3xl font-bold mt-1 text-primary">{latest.solar > 50 ? "GREEN" : "GRID"}</div>
          <p className="text-xs text-muted-foreground mt-2">Renewable harvest covers {latest.solar}% of current draw.</p>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold">Self-Learning Schedule</h3>
        <p className="text-xs text-muted-foreground">Detected daily pollution peaks — purifier pre-activates 10 min before.</p>
        <div className="mt-4 grid grid-cols-12 gap-1 h-24 items-end">
          {Array.from({ length: 24 }).map((_, h) => {
            const intensity = Math.abs(Math.sin((h - 7) / 4)) * 100;
            return (
              <div key={h} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${10 + intensity * 0.8}%`,
                    background: `linear-gradient(to top, oklch(0.82 0.18 195 / ${0.3 + intensity / 200}), oklch(0.82 0.22 150 / ${0.3 + intensity / 200}))`,
                  }}
                />
                <span className="text-[9px] text-muted-foreground">{h}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, unit, color }: { label: string; value: number; unit: string; color: "primary" | "accent" }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${color === "primary" ? "text-primary" : "text-accent"}`}>{Math.round(value)}{unit}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={`h-full ${color === "primary" ? "bg-primary" : "bg-accent"}`}
          style={{ boxShadow: color === "primary" ? "0 0 8px oklch(0.82 0.18 195)" : "0 0 8px oklch(0.82 0.22 150)" }}
        />
      </div>
    </div>
  );
}

function ForecastTile({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "neon-border bg-primary/5" : "border-border/40 bg-background/30"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${highlight ? "neon-text" : ""}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-lg p-3 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-bold neon-text">{value}</div>
    </div>
  );
}
