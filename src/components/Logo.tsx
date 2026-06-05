import logoImg from "@/assets/airpulse-logo.png";

type LogoProps = {
  size?: number;
  withText?: boolean;
  className?: string;
};

// AirPulse logo mark + wordmark. The ring/pulse stuff is just CSS
// classes defined in styles.css — kept here so the header has some life.
export default function Logo({ size = 40, withText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 brand-glow"
        style={{ width: size, height: size }}
      >
        <span
          className="absolute inset-0 rounded-full logo-orbit"
          style={{ border: "1px dashed oklch(0.55 0.13 235 / 0.45)" }}
        />
        <span className="absolute inset-1 rounded-full pulse-ring bg-primary/10" />
        <img
          src={logoImg}
          alt="AirPulse IoT logo"
          width={size}
          height={size}
          className="relative w-full h-full object-contain"
        />
      </div>

      {withText && (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-[0.15em] text-foreground">
            AIR<span className="neon-text">PULSE</span>
          </div>
          <div className="text-[9px] tracking-[0.3em] text-muted-foreground -mt-0.5">
            IoT · SMART AIR INTELLIGENCE
          </div>
        </div>
      )}
    </div>
  );
}