import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// status -> tailwind text class. keep it small, just three states.
const STATUS_COLORS: Record<MetricStatus, string> = {
  good: "text-accent",
  warn: "text-warn",
  danger: "text-destructive",
};

export type MetricStatus = "good" | "warn" | "danger";

interface MetricBoxProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  status?: MetricStatus;
  sub?: string;
}

// One of the little stat cards on the dashboard.
// I had to play with the blur + offset on the bg circle a bit
// to get it to look "glowing" without being too noisy.
export default function MetricBox({
  label,
  value,
  unit,
  icon: Icon,
  status = "good",
  sub,
}: MetricBoxProps) {
  const color = STATUS_COLORS[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="glass rounded-xl p-4 relative overflow-hidden group"
    >
      {/* decorative glow blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />

      <div className="flex items-center justify-between relative">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>

      <div className="mt-2 flex items-baseline gap-1 relative">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </div>

      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </motion.div>
  );
}