// Fake sensor data for the demo build.
// Once the ESP32 + MQTT backend is hooked up, this whole file
// gets replaced by a websocket subscription. For now we just
// generate plausible-looking numbers so the UI has something to draw.

import { clamp, drift } from "@/utils/math";

export interface SensorReading {
  time: string;
  co2: number;
  temp: number;
  humidity: number;
  aqi: number;
  pm25: number;
  pm10: number;
  uv: number;
  smoke: number;
  battery: number;
  solar: number;
  occupancy: number;
}

// rough AQI calc from PM2.5 + CO2 — not the real EPA formula,
// just something that moves in the right direction
function fakeAqi(pm25: number, co2: number) {
  return clamp(Math.round(pm25 * 1.8 + (co2 - 400) * 0.05), 10, 320);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// build N points of fake history walking backwards from "now"
export function buildHistory(points = 40): SensorReading[] {
  const readings: SensorReading[] = [];

  // starting values — picked so the first frame looks normal-ish
  let co2 = 520;
  let temp = 26;
  let humidity = 55;
  let pm25 = 22;
  let pm10 = 38;
  let uv = 4;
  let smoke = 5;
  let battery = 78;
  let solar = 60;
  let occupancy = 4;

  const now = Date.now();

  for (let i = points - 1; i >= 0; i--) {
    co2 = drift(co2, 40, 380, 1400);
    temp = drift(temp, 0.6, 18, 38);
    humidity = drift(humidity, 3, 25, 90);
    pm25 = drift(pm25, 6, 5, 180);
    pm10 = drift(pm10, 8, 10, 220);
    uv = drift(uv, 1, 0, 11);
    smoke = drift(smoke, 4, 0, 80);
    battery = drift(battery, 1.2, 35, 100);
    solar = drift(solar, 8, 0, 100);
    occupancy = clamp(Math.round(drift(occupancy, 1, 0, 20)), 0, 20);

    readings.push({
      time: formatTime(new Date(now - i * 60_000)),
      co2: Math.round(co2),
      temp: +temp.toFixed(1),
      humidity: Math.round(humidity),
      aqi: fakeAqi(pm25, co2),
      pm25: Math.round(pm25),
      pm10: Math.round(pm10),
      uv: +uv.toFixed(1),
      smoke: Math.round(smoke),
      battery: Math.round(battery),
      solar: Math.round(solar),
      occupancy,
    });
  }

  return readings;
}

// step one frame forward from the previous reading
export function nextReading(last: SensorReading): SensorReading {
  const co2 = drift(last.co2, 60, 380, 1400);
  const temp = drift(last.temp, 0.8, 18, 38);
  const humidity = drift(last.humidity, 4, 25, 90);
  const pm25 = drift(last.pm25, 8, 5, 180);
  const pm10 = drift(last.pm10, 10, 10, 220);

  return {
    time: formatTime(new Date()),
    co2: Math.round(co2),
    temp: +temp.toFixed(1),
    humidity: Math.round(humidity),
    aqi: fakeAqi(pm25, co2),
    pm25: Math.round(pm25),
    pm10: Math.round(pm10),
    uv: +drift(last.uv, 1, 0, 11).toFixed(1),
    smoke: Math.round(drift(last.smoke, 6, 0, 80)),
    battery: Math.round(drift(last.battery, 1.5, 35, 100)),
    solar: Math.round(drift(last.solar, 10, 0, 100)),
    occupancy: clamp(Math.round(drift(last.occupancy, 1, 0, 20)), 0, 20),
  };
}

// 0 = bad, 100 = great. weighting is rough — got these numbers
// from playing around with the demo until it "felt right"
export function airQualityScore(s: SensorReading): number {
  const aqiPart = clamp(100 - s.aqi / 3, 0, 100);
  const co2Part = clamp(100 - (s.co2 - 400) / 10, 0, 100);
  const tempPart = clamp(100 - Math.abs(s.temp - 24) * 4, 0, 100);
  const pmPart = clamp(100 - s.pm25 / 2, 0, 100);

  return Math.round(
    aqiPart * 0.3 + co2Part * 0.3 + tempPart * 0.2 + pmPart * 0.2,
  );
}

export function describeScore(score: number) {
  if (score >= 90) return { label: "Excellent", color: "text-accent" };
  if (score >= 70) return { label: "Safe", color: "text-primary" };
  if (score >= 40) return { label: "Moderate Risk", color: "text-warn" };
  return { label: "Dangerous", color: "text-destructive" };
}

// keeping the old names around so existing imports don't break.
// TODO: clean these up once everything points at the new names
export const generateHistory = buildHistory;
export const riskScore = airQualityScore;
export const riskLabel = describeScore;
export { useSensors, useLiveSensors } from "@/hooks/useSensors";