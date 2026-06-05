import { createFileRoute } from "@tanstack/react-router";
import { useLiveSensors } from "@/data/mockSensors";
import { BarChart3, Download } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "Historical Analytics — AirPulse IoT" }, { name: "description", content: "Historical trends and reporting from sensor data." }] }),
});

function Analytics() {
  const { history } = useLiveSensors();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({
    day: d,
    avgAQI: 60 + Math.round(Math.sin(i) * 20 + Math.random() * 25),
    avgCO2: 500 + Math.round(Math.cos(i) * 80 + Math.random() * 120),
  }));

  function exportCsv() {
    const rows = [["time", "co2", "aqi", "pm25", "temp", "humidity"], ...history.map((h) => [h.time, h.co2, h.aqi, h.pm25, h.temp, h.humidity])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "airpulse-data.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <BarChart3 className="w-9 h-9 text-primary" />
            Historical <span className="neon-text">Analytics</span>
          </h1>
          <p className="text-muted-foreground mt-2">Trends, reports and exports.</p>
        </div>
        <button onClick={exportCsv} className="px-4 py-2 rounded-lg neon-border bg-primary/10 text-primary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold">Weekly AQI & CO₂ Averages</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={days}>
            <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
            <XAxis dataKey="day" stroke="oklch(0.7 0.03 220)" fontSize={11} />
            <YAxis stroke="oklch(0.7 0.03 220)" fontSize={11} />
            <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
            <Bar dataKey="avgAQI" fill="oklch(0.82 0.18 195)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avgCO2" fill="oklch(0.82 0.22 150)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { l: "Average AQI (7d)", v: "72" },
          { l: "Peak CO₂ (7d)", v: "942 ppm" },
          { l: "Hazard Events", v: "4" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-xl p-5">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="text-3xl font-bold neon-text mt-1">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
