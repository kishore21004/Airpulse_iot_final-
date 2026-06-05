import { createFileRoute } from "@tanstack/react-router";
import { useLiveSensors, riskScore, riskLabel } from "@/data/mockSensors";
import MetricBox from "@/components/MetricBox";
import { Wind, Thermometer, Droplets, Gauge, Cloud, Sun, Flame, Users, Battery } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, LineChart } from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Live Dashboard — AirPulse IoT" }, { name: "description", content: "Real-time CO₂, AQI, PM, temperature and humidity from the WSN." }] }),
});

function Dashboard() {
  const { history, latest } = useLiveSensors();
  const score = riskScore(latest);
  const r = riskLabel(score);

  const co2Status = latest.co2 > 1000 ? "danger" : latest.co2 > 700 ? "warn" : "good";
  const aqiStatus = latest.aqi > 150 ? "danger" : latest.aqi > 80 ? "warn" : "good";
  const pmStatus = latest.pm25 > 55 ? "danger" : latest.pm25 > 25 ? "warn" : "good";
  const tempStatus = latest.temp > 32 ? "danger" : latest.temp > 28 ? "warn" : "good";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Live <span className="neon-text">Environment</span> Dashboard</h1>
          <p className="text-muted-foreground mt-1">Streaming from 12 WSN nodes · MQTT · updated every 2.5s</p>
        </div>
        <motion.div
          key={score}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-xl px-6 py-4 text-center neon-border"
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Risk Score</div>
          <div className={`text-4xl font-bold ${r.color}`}>{score}</div>
          <div className={`text-sm ${r.color}`}>{r.label}</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricBox label="CO₂" value={latest.co2} unit="ppm" icon={Cloud} status={co2Status} sub="Safe < 700" />
        <MetricBox label="AQI" value={latest.aqi} icon={Gauge} status={aqiStatus} sub="EPA scale" />
        <MetricBox label="PM2.5" value={latest.pm25} unit="µg/m³" icon={Wind} status={pmStatus} />
        <MetricBox label="PM10" value={latest.pm10} unit="µg/m³" icon={Wind} status={pmStatus} />
        <MetricBox label="Temperature" value={latest.temp} unit="°C" icon={Thermometer} status={tempStatus} />
        <MetricBox label="Humidity" value={latest.humidity} unit="%" icon={Droplets} />
        <MetricBox label="UV Index" value={latest.uv} icon={Sun} />
        <MetricBox label="Smoke" value={latest.smoke} unit="ppm" icon={Flame} status={latest.smoke > 40 ? "danger" : "good"} />
        <MetricBox label="Occupancy" value={latest.occupancy} unit="ppl" icon={Users} />
        <MetricBox label="Battery" value={latest.battery} unit="%" icon={Battery} status={latest.battery < 50 ? "warn" : "good"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="CO₂ & AQI Trend" subtitle="Last 60 minutes">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="co2g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.18 195)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.82 0.18 195)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aqig" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.22 150)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.82 0.22 150)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
              <XAxis dataKey="time" stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="co2" stroke="oklch(0.82 0.18 195)" fill="url(#co2g)" strokeWidth={2} />
              <Area type="monotone" dataKey="aqi" stroke="oklch(0.82 0.22 150)" fill="url(#aqig)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Particulate Matter" subtitle="PM2.5 vs PM10">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
              <XAxis dataKey="time" stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="pm25" stroke="oklch(0.85 0.18 80)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pm10" stroke="oklch(0.65 0.25 25)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Temperature & Humidity" subtitle="Comfort indicators">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
              <XAxis dataKey="time" stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="temp" stroke="oklch(0.85 0.18 80)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="humidity" stroke="oklch(0.82 0.18 195)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Energy" subtitle="Solar harvest vs battery">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="solg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.85 0.18 80)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.85 0.18 80)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
              <XAxis dataKey="time" stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0.03 220)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="solar" stroke="oklch(0.85 0.18 80)" fill="url(#solg)" strokeWidth={2} />
              <Line type="monotone" dataKey="battery" stroke="oklch(0.82 0.22 150)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="text-xs text-accent flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent pulse-ring" /> live</span>
      </div>
      {children}
    </div>
  );
}
