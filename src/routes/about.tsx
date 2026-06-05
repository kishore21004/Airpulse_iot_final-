import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Leaf, ShieldCheck, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({ meta: [{ title: "About — AirPulse IoT" }, { name: "description", content: "Project vision, architecture and tech stack." }] }),
});

function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold">About <span className="neon-text">AirPulse IoT</span></h1>
        <p className="text-muted-foreground mt-3 text-lg">
          A next-generation AI-powered platform for harmful environment monitoring and smart air purification — built on wireless sensor networks, IoT, machine learning, and renewable energy.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {[
          { icon: Cpu, title: "Edge + Cloud Architecture", desc: "ESP32 sensor nodes → MQTT broker → Firebase / cloud analytics → ML inference." },
          { icon: Leaf, title: "Renewable First", desc: "Solar harvesting with adaptive low-power mode for true off-grid deployment." },
          { icon: ShieldCheck, title: "Predict-then-Protect", desc: "Forecast hazards before they occur and trigger autonomous purification responses." },
          { icon: GraduationCap, title: "Research Ready", desc: "Designed for IEEE projects, smart-city pilots, and sustainable engineering research." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-xl p-5">
            <f.icon className="w-6 h-6 text-primary" />
            <div className="font-semibold mt-2">{f.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-semibold">Tech Stack</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["React", "Tailwind CSS", "Framer Motion", "Recharts", "Python", "FastAPI", "Scikit-learn", "TensorFlow", "LSTM", "Firebase", "MongoDB", "MQTT", "WebSockets", "ESP32", "LoRa"].map((t) => (
            <span key={t} className="px-3 py-1 rounded-full text-xs glass neon-border text-primary">{t}</span>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-semibold">Deployment Targets</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <li>• Smart classrooms & libraries</li>
          <li>• Hospitals & clinics</li>
          <li>• Bus stops & transit hubs</li>
          <li>• Construction sites</li>
          <li>• Rural health centers</li>
          <li>• Industrial monitoring</li>
        </ul>
      </div>
    </div>
  );
}
