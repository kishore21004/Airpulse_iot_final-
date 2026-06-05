import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Activity, Brain, Wind, Sun, Network, MessageCircle, ShieldCheck, Cpu, Send, Sparkles } from "lucide-react";
import { useLiveSensors, riskScore, riskLabel } from "@/data/mockSensors";
import hero from "@/assets/hero-city.jpg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "AirPulse IoT — Smart Environmental Intelligence" },
      { name: "description", content: "Real-time air quality monitoring, ML predictions, and AI-driven purification powered by renewable energy." },
    ],
  }),
});

const features = [
  { icon: Activity, title: "Real-Time Monitoring", desc: "CO₂, AQI, PM2.5/10, temperature, humidity, UV — streamed live from a wireless sensor network." },
  { icon: Brain, title: "ML Predictions", desc: "Forecast air quality, hazard scores and pollution accumulation using LSTM and ensemble models." },
  { icon: Wind, title: "Smart Purification", desc: "Adaptive purifier control that learns pollution patterns and optimizes airflow autonomously." },
  { icon: Sun, title: "Renewable Energy", desc: "Solar harvesting, intelligent battery management, and AI power optimization for off-grid operation." },
  { icon: Network, title: "WSN Mesh", desc: "Multi-node mesh with MQTT, gateway routing, and self-healing connectivity." },
  { icon: MessageCircle, title: "AI Assistant", desc: "Conversational guidance, environmental insights and emergency response — voice-ready." },
];

function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={hero} alt="Futuristic smart city with environmental sensors" width={1920} height={1024} className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
          <div className="absolute inset-0 grid-bg opacity-40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-36">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-ring" />
              Next-Gen Environmental Intelligence
            </span>
            <h1 className="mt-6 text-4xl md:text-7xl font-bold leading-tight max-w-4xl">
              <span className="neon-text">AirPulse IoT</span>
              <br />
              <span className="text-foreground">Breathe Smarter. Live Safer.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              An AI-powered platform for harmful environment monitoring and smart air purification — combining wireless sensor networks, machine learning, and renewable energy.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium neon-glow hover:scale-105 transition-transform">
                Open Live Dashboard
              </Link>
              <Link to="/chatbot" className="px-6 py-3 rounded-lg glass neon-border text-primary font-medium">
                Chat with AirPulse AI
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
              {[
                { k: "12", l: "Sensor Nodes" },
                { k: "98%", l: "Uptime" },
                { k: "<2s", l: "Latency" },
                { k: "100%", l: "Solar Powered" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-lg p-4">
                  <div className="text-2xl font-bold neon-text">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Engineered for the future of <span className="neon-text">smart cities</span></h2>
          <p className="mt-4 text-muted-foreground">Twelve integrated subsystems from sensing to AI-driven action.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-6 hover:neon-border transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center neon-border mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="glass rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 text-primary"><ShieldCheck className="w-5 h-5" /><Cpu className="w-5 h-5" /></div>
              <h3 className="text-2xl md:text-3xl font-bold mt-2">From sensing to safety — autonomously.</h3>
              <p className="mt-2 text-muted-foreground">Predict hazards before they occur. Trigger purification. Notify. Optimize energy. All in real time.</p>
            </div>
            <div className="flex md:justify-end">
              <Link to="/predictions" className="px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium" style={{ boxShadow: "var(--shadow-neon-green)" }}>
                Explore ML Center
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Inline AI Assistant — home page end */}
      <HomeChatbot />
    </div>
  );
}

type ChatMsg = { role: "user" | "ai"; text: string };

function answer(input: string, latest: ReturnType<typeof useLiveSensors>["latest"]): string {
  const q = input.toLowerCase();
  const score = riskScore(latest);
  const r = riskLabel(score);
  if (q.includes("co2") || q.includes("co₂"))
    return `CO₂ is ${latest.co2} ppm — ${latest.co2 > 1000 ? "above safe limit. Ventilate or run the purifier." : "within safe range."}`;
  if (q.includes("aqi") || q.includes("air"))
    return `Live AQI ${latest.aqi}, PM2.5 ${latest.pm25} µg/m³. Status: ${r.label}.`;
  if (q.includes("safe") || q.includes("risk") || q.includes("danger"))
    return `Environment score: ${score}/100 — ${r.label}.`;
  if (q.includes("predict") || q.includes("forecast") || q.includes("hour"))
    return "LSTM forecast: stable next 60 min. Confidence 91%. No hazard predicted.";
  if (q.includes("battery") || q.includes("solar") || q.includes("energy"))
    return `Battery ${latest.battery}%, solar harvest ${latest.solar} W.`;
  return `I'm AirPulse AI. Ask about CO₂, AQI, safety, forecasts, or energy. Current score: ${score}/100.`;
}

function HomeChatbot() {
  const { latest } = useLiveSensors();
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: "ai", text: "Hi 👋 I'm AirPulse AI. Ask me about your live air quality, risk, or forecasts." },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    const t = input.trim();
    if (!t) return;
    const reply = answer(t, latest);
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "ai", text: reply }]);
    setInput("");
  };

  const suggestions = ["What's the CO₂ level?", "Is it safe now?", "Forecast next hour", "Battery status"];

  return (
    <section className="max-w-7xl mx-auto px-4 pb-24">
      <div className="relative rounded-[2rem] overflow-hidden glass p-6 md:p-12 border border-primary/20">
        {/* Logo-inspired ambient backdrop */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.55]"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="hc-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.1 200)" />
              <stop offset="100%" stopColor="oklch(0.55 0.13 235)" />
            </linearGradient>
            <linearGradient id="hc-pulse" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="oklch(0.55 0.13 235)" />
              <stop offset="100%" stopColor="oklch(0.78 0.1 200)" />
            </linearGradient>
            <pattern id="hc-hex" x="0" y="0" width="34" height="30" patternUnits="userSpaceOnUse">
              <polygon points="17,2 32,10 32,22 17,30 2,22 2,10" fill="none" stroke="oklch(0.72 0.13 220 / 0.35)" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect x="0" y="380" width="1200" height="220" fill="url(#hc-hex)" />
          <g transform="translate(600 300)">
            <circle r="220" fill="none" stroke="oklch(0.55 0.13 235 / 0.18)" strokeWidth="0.8" strokeDasharray="3 5" className="logo-orbit" style={{ transformOrigin: "center" }} />
            <path d="M -220 0 A 220 220 0 0 1 220 0" fill="none" stroke="url(#hc-ring)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 220 0 A 220 220 0 0 1 -220 0" fill="none" stroke="url(#hc-ring)" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
          </g>
          <polyline className="logo-ecg" points="0,140 220,140 280,80 340,210 400,110 470,160 560,140 1200,140" fill="none" stroke="url(#hc-pulse)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="980" cy="120" r="3.5" fill="oklch(0.55 0.13 235)">
            <animate attributeName="cy" values="120;90;120" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>

        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 -bottom-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

        <div className="grid md:grid-cols-5 gap-8 relative">
          <div className="md:col-span-2 flex flex-col">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full glass neon-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-ring" />
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-medium">Live AI Assistant</span>
            </div>

            <h3 className="mt-5 text-3xl md:text-4xl font-bold leading-tight">
              Talk to <span className="neon-text">AirPulse AI</span>
              <br />
              <span className="text-foreground/80 text-2xl md:text-3xl">your atmosphere, in plain words.</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-md">
              A conversational layer wired to live WSN telemetry — ask about CO₂, AQI, safety, energy, or what is predicted for the next hour.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { k: "AQI", v: latest.aqi },
                { k: "CO₂", v: latest.co2 },
                { k: "PM2.5", v: latest.pm25 },
              ].map((s) => (
                <div key={s.k} className="px-3 py-2 rounded-lg glass border border-primary/25 text-center">
                  <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground">{s.k}</div>
                  <div className="text-base font-bold neon-text">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 rounded-full glass neon-border text-primary hover:bg-primary/10 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-2xl glass neon-border flex flex-col h-[420px] overflow-hidden">
              <div className="relative flex items-center gap-2 px-4 py-3 border-b border-primary/20 bg-primary/5">
                <div className="relative w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full pulse-ring" />
                  <MessageCircle className="w-3.5 h-3.5 text-primary relative" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">AirPulse AI</div>
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">connected · streaming</div>
                </div>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full glass neon-border text-primary">
                  AQI {latest.aqi} · CO₂ {latest.co2}
                </span>
              </div>

              <svg viewBox="0 0 400 16" className="w-full h-3" preserveAspectRatio="none" aria-hidden>
                <polyline className="logo-ecg" points="0,8 80,8 100,2 120,14 140,5 160,10 200,8 400,8" fill="none" stroke="url(#hc-pulse)" strokeWidth="1.2" />
              </svg>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {m.role === "ai" && (
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] text-primary font-bold shrink-0">AI</div>
                    )}
                    <div className={`max-w-[78%] text-sm px-3.5 py-2 rounded-2xl ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm shadow-[0_4px_14px_oklch(0.72_0.13_220/0.3)]" : "bg-card/80 border border-primary/20 rounded-bl-sm"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 border-t border-primary/20 bg-primary/5 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about air quality, safety, forecast…"
                  className="flex-1 bg-background/60 rounded-lg px-3 py-2 text-sm outline-none border border-primary/20 focus:border-primary/50 transition"
                />
                <button onClick={send} className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground flex items-center gap-1 text-sm neon-glow hover:scale-105 transition-transform">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
