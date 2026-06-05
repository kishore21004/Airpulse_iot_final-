import { createFileRoute } from "@tanstack/react-router";
import { useLiveSensors } from "@/data/mockSensors";
import { Sun, Battery, Zap, Leaf } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import solar from "@/assets/solar.jpg";

export const Route = createFileRoute("/energy")({
  component: Energy,
  head: () => ({ meta: [{ title: "Renewable Energy — AirPulse IoT" }, { name: "description", content: "Solar harvesting, battery management and AI energy optimization." }] }),
});

function Energy() {
  const { history, latest } = useLiveSensors();
  const totalHarvest = history.reduce((s, r) => s + r.solar, 0);
  const eff = Math.round((latest.solar / 100) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="relative rounded-2xl overflow-hidden">
        <img src={solar} alt="Solar panels powering sensor network" loading="lazy" width={1024} height={1024} className="w-full h-56 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent flex items-center px-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Sun className="w-9 h-9 text-warn" />
              <span className="neon-text">Renewable</span> Energy
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md">Solar-harvested power with AI-optimized battery management for off-grid operation.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Battery} label="Battery" value={`${latest.battery}%`} color="text-accent" />
        <Stat icon={Sun} label="Solar Output" value={`${latest.solar} W`} color="text-warn" />
        <Stat icon={Zap} label="Today Harvest" value={`${(totalHarvest / 60).toFixed(1)} kWh`} color="text-primary" />
        <Stat icon={Leaf} label="Renewable Score" value={`${eff}%`} color="text-accent" />
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold">Solar Harvest vs Battery</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.85 0.18 80)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="oklch(0.85 0.18 80)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="b1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.22 150)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.82 0.22 150)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(0.4 0.06 220 / 0.2)" />
            <XAxis dataKey="time" stroke="oklch(0.7 0.03 220)" fontSize={10} />
            <YAxis stroke="oklch(0.7 0.03 220)" fontSize={10} />
            <Tooltip contentStyle={{ background: "oklch(0.2 0.04 245)", border: "1px solid oklch(0.82 0.18 195 / 0.3)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="solar" stroke="oklch(0.85 0.18 80)" fill="url(#s1)" strokeWidth={2} />
            <Area type="monotone" dataKey="battery" stroke="oklch(0.82 0.22 150)" fill="url(#b1)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="font-semibold flex items-center gap-2"><Leaf className="w-4 h-4 text-accent" /> AI Power Optimization</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Predicted battery drain: 12% in next 4h — within safe range.</li>
          <li>• Low-power mode armed for nodes #7 and #11 (low solar exposure).</li>
          <li>• Scheduled purifier ramp-up aligned with peak solar window (12:00–14:00).</li>
          <li>• Estimated 100% renewable autonomy for the next 36 hours.</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-2xl font-bold mt-2 ${color}`}>{value}</div>
    </div>
  );
}
