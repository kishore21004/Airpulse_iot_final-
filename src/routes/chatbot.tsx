import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveSensors, riskScore, riskLabel } from "@/data/mockSensors";
import { MessageCircle, Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/chatbot")({
  component: Chatbot,
  head: () => ({ meta: [{ title: "AI Assistant — AirPulse IoT" }, { name: "description", content: "Conversational environmental AI assistant." }] }),
});

type Msg = { role: "user" | "ai"; text: string };

function generateResponse(input: string, latest: ReturnType<typeof useLiveSensors>["latest"]): string {
  const q = input.toLowerCase();
  const score = riskScore(latest);
  const r = riskLabel(score);

  if (q.includes("co2") || q.includes("co₂")) {
    return `Current CO₂ is ${latest.co2} ppm. ${
      latest.co2 > 1000 ? "Above safe threshold — open windows or activate purifier." : "Within acceptable range."
    }`;
  }
  if (q.includes("aqi") || q.includes("air quality")) {
    return `Live AQI: ${latest.aqi}. Status: ${r.label}. PM2.5 measured at ${latest.pm25} µg/m³.`;
  }
  if (q.includes("safe") || q.includes("danger")) {
    return `Environmental safety score: ${score}/100 — ${r.label}. ${score < 50 ? "Recommend ventilation and purifier activation." : "No action required."}`;
  }
  if (q.includes("purif") || q.includes("fan")) {
    return latest.aqi > 80 ? "Purifier auto-engaged at high speed due to elevated AQI." : "Purifier currently in standby — air clean enough.";
  }
  if (q.includes("temp")) {
    return `Temperature is ${latest.temp}°C with ${latest.humidity}% humidity.`;
  }
  if (q.includes("battery") || q.includes("energy") || q.includes("solar")) {
    return `Battery: ${latest.battery}%, solar harvest: ${latest.solar} W. Expected 36h of off-grid autonomy.`;
  }
  if (q.includes("predict") || q.includes("forecast")) {
    return "LSTM forecast: CO₂ likely stable next 60 min. Confidence 91%. No hazard predicted.";
  }
  return `I monitor 12 sensor nodes in real time. Current risk score: ${score}/100 (${r.label}). Ask me about CO₂, AQI, purification, energy, or predictions.`;
}

const suggestions = [
  "What's the air quality?",
  "Is the room safe?",
  "Should I activate the purifier?",
  "Forecast CO₂ for the next hour",
  "Battery and solar status?",
];

function Chatbot() {
  const { latest } = useLiveSensors();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hello! I'm AirPulse AI. I have live access to all sensor nodes. How can I help?" },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: generateResponse(text, latest) }]);
    }, 400);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <MessageCircle className="w-9 h-9 text-primary" />
          AirPulse <span className="neon-text">AI Assistant</span>
        </h1>
        <p className="text-muted-foreground mt-2">Sensor-aware conversational guidance · multilingual ready · voice optional.</p>
      </div>

      <div className="glass rounded-2xl flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "glass neon-border text-foreground"
                }`}
              >
                {m.role === "ai" && <Sparkles className="w-3 h-3 inline mr-1.5 text-accent" />}
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border/40">
          <div className="flex gap-2 mb-2 overflow-x-auto">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full glass hover:neon-border text-muted-foreground hover:text-primary transition-colors">
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about air quality, predictions, or safety…"
              className="flex-1 px-4 py-3 rounded-lg bg-background/60 border border-border focus:neon-border outline-none text-sm"
            />
            <button type="submit" className="px-4 py-3 rounded-lg bg-primary text-primary-foreground neon-glow">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
