# AirPulse IoT

Final-year project — a small dashboard for an AI-powered air quality &
smart purification system. The hardware side runs on ESP32 nodes that talk
MQTT; this repo is just the front-end + a bit of fake data so we can
demo the UI without the boards plugged in.

Built with React + Vite (TanStack Start), Tailwind CSS and Framer Motion.
Charts use Recharts.

## Pages

- **Home** – landing page with the elevator-pitch and a couple of demo chips.
- **Dashboard** – live tiles for CO₂, AQI, PM2.5/10, temperature, etc.
- **ML Predictions** – cheap linear-regression forecast over the last few samples.
  (Real model is LSTM, kept on the backend.)
- **Purification** – auto/manual mode for the purifier with a fan-speed slider.
- **Energy** – solar in, battery out, very rough efficiency number.
- **WSN** – status of the mesh nodes.
- **Health** – exposure score for whoever is in the room.
- **Analytics** – longer-range charts.
- **About** – stack, deployment targets, who built it.

## Running it

You need Node 20+ (anything newer is fine).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Build a static bundle:

```bash
npm run build
npm run preview
```

## Folder layout

```
src/
  assets/           images (logo, hero, etc.)
  components/       reusable UI bits
    AppShell.tsx    header + footer wrapper
    Logo.tsx        brand mark
    MetricBox.tsx   stat tile used on the dashboard
    ui/             shadcn primitives (don't really touch these)
  data/
    mockSensors.ts  fake live-feed data + scoring helpers
  hooks/
    useSensors.ts   custom hook that returns the rolling history
  routes/           file-based routes — see TanStack Router docs
  utils/
    math.ts         clamp + random-drift helpers
  styles.css        tailwind + design tokens
```

## A few notes

- `data/mockSensors.ts` is a stand-in until the MQTT bridge is ready.
  Once the broker is live, swap the body of `useSensors` to subscribe
  to the topic instead of `setInterval`.
- The "AI" chatbot on the home page is just a tiny keyword matcher.
  Nothing fancy — was enough for the demo video.
- Scoring weights in `airQualityScore` were tuned by hand. Not based
  on the official EPA formula.

## TODO

- [ ] Hook up the real MQTT feed
- [ ] Persist user preferences (fan speed, alert thresholds) to localStorage
- [ ] Better mobile layout for the long charts
- [ ] Dark / light theme toggle (everything is dark right now)

## Credits

Built as part of our IoT major project. Hardware by the team, software
mostly by me. Logo + hero image are project assets.

## Demo Videos

Working demo recordings are included in the `demo/video/` folder:

- `demo/video/project_demo_1.mp4` — project walkthrough (part 1)
- `demo/video/project_demo_2.mp4` — project walkthrough (part 2)

These show the live dashboard, sensor tiles updating, and the
purification controls in action.
