// small math helpers I keep reusing (couldn't find a tiny lib that wasn't overkill)

export function clamp(value: number, low: number, high: number) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

// random drift between -range/2 and +range/2 — used for the fake live sensor feed
export function drift(prev: number, range: number, low: number, high: number) {
  const next = prev + (Math.random() - 0.5) * range;
  return clamp(next, low, high);
}