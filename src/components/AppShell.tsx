import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Brain,
  HeartPulse,
  Home,
  Info,
  Network,
  Sun,
  Wind,
} from "lucide-react";

import Logo from "./Logo";

// Top nav items. Order matters here — it's also the order on mobile.
const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/predictions", label: "ML Predictions", icon: Brain },
  { to: "/purification", label: "Purification", icon: Wind },
  { to: "/energy", label: "Energy", icon: Sun },
  { to: "/network", label: "WSN", icon: Network },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/about", label: "About", icon: Info },
] as const;

/**
 * AppShell — wraps every page with the header + footer.
 * Mounted from the root route via <AppShell />.
 */
export default function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <Logo size={38} />
          </Link>

          {/* desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-6 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all " +
                    (isActive
                      ? "bg-primary/15 text-primary neon-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40")
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* status chips on the right */}
          <div className="ml-auto hidden md:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full glass">
              <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-ring" />
              <span className="text-muted-foreground">Live · 12 Nodes</span>
            </span>
            <span className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full neon-border bg-primary/5">
              <Brain className="w-3 h-3 text-primary" />
              <span className="text-primary font-medium">AI · LSTM v3.2</span>
            </span>
          </div>
        </div>

        {/* mobile nav — just a horizontal scroll bar with the same items */}
        <div className="lg:hidden border-t border-border/40 overflow-x-auto">
          <div className="flex gap-1 px-2 py-2 min-w-max">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap " +
                    (isActive ? "bg-primary/20 text-primary" : "text-muted-foreground")
                  }
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="glass border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-muted-foreground flex flex-wrap justify-between gap-4">
          <span>
            © {new Date().getFullYear()} AirPulse IoT — Intelligent Environment Monitoring
          </span>
          <span>Powered by WSN · IoT · AI · Renewable Energy</span>
        </div>
      </footer>
    </div>
  );
}