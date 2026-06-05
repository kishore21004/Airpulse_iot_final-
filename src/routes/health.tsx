import { createFileRoute } from "@tanstack/react-router";
import { useLiveSensors } from "@/data/mockSensors";
import { HeartPulse, Brain, Wind } from "lucide-react";

export const Route = createFileRoute("/health")({
  component: Health,
  head: () => ({ meta: [{ title: "Health Impact — AirPulse IoT" }, { name: "description", content: "AI-driven health risk and human comfort analysis." }] }),
});

function Health() {
  const { latest } = useLiveSensors();
  const drowsiness = Math.min(100, Math.round((latest.co2 - 400) / 8));
  const headache = Math.min(100, Math.round(latest.aqi / 2 + (latest.temp - 24) * 2));
  const cognitive = Math.max(0, 100 - drowsiness);
  const respiratory = Math.min(100, Math.round(latest.pm25 * 1.4));
  const comfort = Math.max(0, 100 - Math.round((drowsiness + headache + respiratory) / 4));
  const safeHours = Math.max(0.5, +(8 - drowsiness / 14).toFixed(1));

  const items = [
    { label: "Drowsiness Risk", value: drowsiness },
    { label: "Headache Probability", value: headache },
    { label: "Cognitive Performance", value: cognitive, inverse: true },
    { label: "Respiratory Discomfort", value: respiratory },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <HeartPulse className="w-9 h-9 text-destructive" />
          AI <span className="neon-text">Health Impact</span> Analyzer
        </h1>
        <p className="text-muted-foreground mt-2">ML inference of human comfort and exposure risk based on live conditions.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-6 text-center md:col-span-1">
          <div className="text-xs uppercase text-muted-foreground">Comfort Index</div>
          <div className="text-6xl font-bold neon-text mt-2">{comfort}</div>
          <div className="text-sm text-muted-foreground mt-2">{comfort > 70 ? "Optimal environment" : comfort > 40 ? "Acceptable" : "Suboptimal"}</div>
        </div>
        <div className="glass rounded-xl p-6 md:col-span-2 space-y-4">
          {items.map((it) => (
            <div key={it.label}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{it.label}</span>
                <span className={it.inverse ? "text-accent" : it.value > 60 ? "text-destructive" : it.value > 30 ? "text-warn" : "text-accent"}>{it.value}%</span>
              </div>
              <div className="h-2 mt-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${it.value}%`,
                    background: it.inverse
                      ? "linear-gradient(to right, oklch(0.82 0.22 150), oklch(0.82 0.18 195))"
                      : it.value > 60
                      ? "oklch(0.65 0.25 25)"
                      : it.value > 30
                      ? "oklch(0.85 0.18 80)"
                      : "oklch(0.82 0.22 150)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <Wind className="w-5 h-5 text-primary" />
          <div className="font-semibold mt-2">Safe Exposure</div>
          <div className="text-3xl font-bold neon-text mt-1">{safeHours} h</div>
          <p className="text-xs text-muted-foreground">Estimated time before recommended ventilation break.</p>
        </div>
        <div className="glass rounded-xl p-5">
          <Brain className="w-5 h-5 text-accent" />
          <div className="font-semibold mt-2">AI Recommendation</div>
          <p className="text-sm text-muted-foreground mt-1">
            {comfort > 70
              ? "Maintain current ventilation. Conditions support focused work."
              : "Open windows or activate purifier — CO₂ buildup is reducing cognitive performance."}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <HeartPulse className="w-5 h-5 text-destructive" />
          <div className="font-semibold mt-2">Vulnerable Group Alert</div>
          <p className="text-sm text-muted-foreground mt-1">
            {respiratory > 50 ? "Elevated risk for asthma & elderly. Consider relocation." : "No elevated risk for vulnerable groups."}
          </p>
        </div>
      </div>
    </div>
  );
}
