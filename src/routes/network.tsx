import { createFileRoute } from "@tanstack/react-router";
import { Network, Wifi, Cloud } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/network")({
  component: NetworkView,
  head: () => ({ meta: [{ title: "WSN Visualization — AirPulse IoT" }, { name: "description", content: "Wireless sensor network mesh, gateway and cloud connectivity." }] }),
});

const nodes = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  x: 15 + (i % 5) * 18 + (Math.random() * 6 - 3),
  y: 25 + Math.floor(i / 5) * 38 + (Math.random() * 6 - 3),
  rssi: -40 - Math.floor(Math.random() * 40),
  status: Math.random() > 0.15 ? "online" : "weak",
}));

function NetworkView() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <Network className="w-9 h-9 text-primary" />
          Wireless <span className="neon-text">Sensor Network</span>
        </h1>
        <p className="text-muted-foreground mt-2">Mesh topology · MQTT broker · Cloud relay · self-healing routes.</p>
      </div>

      <div className="glass rounded-2xl p-6 relative h-[500px] grid-bg overflow-hidden">
        {/* Gateway */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-full neon-border bg-background/80 flex items-center justify-center pulse-ring">
              <Cloud className="w-9 h-9 text-primary" />
            </div>
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-primary whitespace-nowrap">Gateway / MQTT</div>
          </div>
        </div>

        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {nodes.map((n) => (
            <line
              key={n.id}
              x1={n.x} y1={n.y} x2={50} y2={50}
              stroke={n.status === "online" ? "oklch(0.82 0.18 195 / 0.5)" : "oklch(0.65 0.25 25 / 0.5)"}
              strokeWidth="0.2"
              strokeDasharray="0.6 0.4"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-2" dur="1s" repeatCount="indefinite" />
            </line>
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div className={`w-10 h-10 rounded-full glass flex items-center justify-center ${n.status === "online" ? "neon-border" : "border border-destructive/60"}`}>
              <Wifi className={`w-4 h-4 ${n.status === "online" ? "text-primary" : "text-destructive"}`} />
            </div>
            <div className="text-[10px] text-center mt-1 text-muted-foreground">N{n.id + 1} · {n.rssi}dBm</div>
          </motion.div>
        ))}
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { l: "Total Nodes", v: "12" },
          { l: "Online", v: "11" },
          { l: "Avg Latency", v: "184 ms" },
          { l: "Packet Loss", v: "0.3%" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="text-2xl font-bold neon-text mt-1">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
