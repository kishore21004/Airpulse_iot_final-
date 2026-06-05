import { useEffect, useState } from "react";
import { buildHistory, nextReading, type SensorReading } from "@/data/mockSensors";

// keep the chart at ~60 points so it doesn't get too crowded
const MAX_POINTS = 60;

/**
 * Tiny hook that pretends to be a live MQTT feed.
 * Returns the rolling history plus the latest reading for convenience.
 */
export function useSensors(refreshMs = 2500) {
  const [history, setHistory] = useState<SensorReading[]>(() => buildHistory());

  useEffect(() => {
    const timer = setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        const updated = [...prev, nextReading(last)];
        // trim oldest points so memory doesn't grow forever
        if (updated.length > MAX_POINTS) updated.shift();
        return updated;
      });
    }, refreshMs);

    return () => clearInterval(timer);
  }, [refreshMs]);

  return {
    history,
    latest: history[history.length - 1],
  };
}

// legacy alias — old code imported `useLiveSensors`
export const useLiveSensors = useSensors;