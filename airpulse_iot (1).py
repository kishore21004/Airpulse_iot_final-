#!/usr/bin/env python3
"""
AirPulse IoT — Single-file Python deployment
=============================================
Run:  python airpulse_iot.py
Then open: http://localhost:5000

Requirements (auto-installed if missing):
  pip install flask

Everything — HTML, CSS, JS, charts, live sensor simulation — is embedded here.
No external files needed.
"""

import sys
import subprocess

# ── auto-install flask if not present ──────────────────────────────────────
try:
    import flask
except ImportError:
    print("Flask not found — installing…")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
    import flask

import random
import math
import time
import json
import threading
from flask import Flask, jsonify, Response

app = Flask(__name__)

# ── Sensor simulation (Python port of mockSensors.ts) ──────────────────────

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def drift(prev, rng, lo, hi):
    return clamp(prev + (random.random() - 0.5) * rng, lo, hi)

def fake_aqi(pm25, co2):
    return clamp(round(pm25 * 1.8 + (co2 - 400) * 0.05), 10, 320)

class SensorState:
    def __init__(self):
        self.co2       = 520.0
        self.temp      = 26.0
        self.humidity  = 55.0
        self.pm25      = 22.0
        self.pm10      = 38.0
        self.uv        = 4.0
        self.smoke     = 5.0
        self.battery   = 78.0
        self.solar     = 60.0
        self.occupancy = 4.0
        self.history   = []
        self._build_history()

    def _build_history(self, points=40):
        now = time.time()
        for i in range(points - 1, -1, -1):
            self.co2      = drift(self.co2,      40,  380, 1400)
            self.temp     = drift(self.temp,     0.6,  18,   38)
            self.humidity = drift(self.humidity,   3,  25,   90)
            self.pm25     = drift(self.pm25,       6,   5,  180)
            self.pm10     = drift(self.pm10,       8,  10,  220)
            self.uv       = drift(self.uv,         1,   0,   11)
            self.smoke    = drift(self.smoke,      4,   0,   80)
            self.battery  = drift(self.battery,  1.2,  35,  100)
            self.solar    = drift(self.solar,      8,   0,  100)
            self.occupancy = clamp(round(drift(self.occupancy, 1, 0, 20)), 0, 20)
            ts = time.strftime("%H:%M", time.localtime(now - i * 60))
            self.history.append(self._snapshot(ts))

    def _snapshot(self, ts=None):
        if ts is None:
            ts = time.strftime("%H:%M")
        return {
            "time":      ts,
            "co2":       round(self.co2),
            "temp":      round(self.temp, 1),
            "humidity":  round(self.humidity),
            "aqi":       fake_aqi(self.pm25, self.co2),
            "pm25":      round(self.pm25),
            "pm10":      round(self.pm10),
            "uv":        round(self.uv, 1),
            "smoke":     round(self.smoke),
            "battery":   round(self.battery),
            "solar":     round(self.solar),
            "occupancy": int(self.occupancy),
        }

    def tick(self):
        self.co2      = drift(self.co2,      60,  380, 1400)
        self.temp     = drift(self.temp,     0.8,  18,   38)
        self.humidity = drift(self.humidity,   4,  25,   90)
        self.pm25     = drift(self.pm25,       8,   5,  180)
        self.pm10     = drift(self.pm10,      10,  10,  220)
        self.uv       = drift(self.uv,         1,   0,   11)
        self.smoke    = drift(self.smoke,      6,   0,   80)
        self.battery  = drift(self.battery,  1.5,  35,  100)
        self.solar    = drift(self.solar,     10,   0,  100)
        self.occupancy = clamp(round(drift(self.occupancy, 1, 0, 20)), 0, 20)
        snap = self._snapshot()
        self.history.append(snap)
        if len(self.history) > 60:
            self.history.pop(0)
        return snap

    def risk_score(self, s=None):
        if s is None:
            s = self.history[-1]
        aqi_part  = clamp(100 - s["aqi"] / 3,                0, 100)
        co2_part  = clamp(100 - (s["co2"] - 400) / 10,       0, 100)
        temp_part = clamp(100 - abs(s["temp"] - 24) * 4,     0, 100)
        pm_part   = clamp(100 - s["pm25"] / 2,               0, 100)
        return round(aqi_part * 0.3 + co2_part * 0.3 + temp_part * 0.2 + pm_part * 0.2)

_sensor = SensorState()
_lock = threading.Lock()

def _bg_tick():
    while True:
        time.sleep(2.5)
        with _lock:
            _sensor.tick()

threading.Thread(target=_bg_tick, daemon=True).start()

# ── API endpoints ───────────────────────────────────────────────────────────

@app.route("/api/sensors")
def api_sensors():
    with _lock:
        latest = _sensor.history[-1]
        history = list(_sensor.history)
        score  = _sensor.risk_score()
    return jsonify({"latest": latest, "history": history, "score": score})

@app.route("/api/sensors/stream")
def api_stream():
    """Server-Sent Events endpoint for live updates."""
    def generate():
        while True:
            with _lock:
                latest  = _sensor.history[-1]
                history = list(_sensor.history)
                score   = _sensor.risk_score()
            data = json.dumps({"latest": latest, "history": history[-20:], "score": score})
            yield f"data: {data}\n\n"
            time.sleep(2.5)
    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── Main HTML page ──────────────────────────────────────────────────────────

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AirPulse IoT — Smart Environmental Intelligence</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root{
  --bg:#f0f4ff;--fg:#1a1f2c;--card:#ffffffbb;--border:rgba(100,140,255,.25);
  --primary:#5b8fff;--accent:#4ecdc4;--warn:#f0a020;--danger:#e74c3c;
  --muted:#6b7280;--radius:12px;
  --glass-bg:rgba(255,255,255,.65);--glass-blur:18px;
  --neon-shadow:0 0 0 1px rgba(91,143,255,.3),0 8px 32px rgba(91,143,255,.18);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:ui-sans-serif,system-ui,sans-serif;background:var(--bg);color:var(--fg);
  background-image:radial-gradient(ellipse at top left,rgba(91,143,255,.18) 0,transparent 55%),
                   radial-gradient(ellipse at bottom right,rgba(78,205,196,.14) 0,transparent 55%);
  min-height:100vh;overflow-x:hidden}
/* ── glass ── */
.glass{background:var(--glass-bg);backdrop-filter:blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter:blur(var(--glass-blur)) saturate(140%);border:1px solid var(--border)}
.neon-border{border:1px solid rgba(91,143,255,.5);box-shadow:var(--neon-shadow)}
.neon-text{background:linear-gradient(135deg,var(--primary),#3a7be0);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
/* ── layout ── */
header{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--border)}
header .inner{max-width:1280px;margin:0 auto;padding:.75rem 1rem;
  display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.logo{font-weight:800;font-size:1.2rem;text-decoration:none;color:inherit;display:flex;align-items:center;gap:.5rem}
nav{display:flex;gap:.25rem;overflow-x:auto;flex:1}
nav a{display:flex;align-items:center;gap:.35rem;padding:.35rem .65rem;border-radius:8px;
  font-size:.82rem;color:var(--muted);text-decoration:none;white-space:nowrap;transition:.15s}
nav a:hover{color:var(--fg);background:rgba(0,0,0,.05)}
nav a.active{background:rgba(91,143,255,.12);color:var(--primary);border:1px solid rgba(91,143,255,.4)}
.status-pill{font-size:.7rem;padding:.25rem .65rem;border-radius:999px;
  display:flex;align-items:center;gap:.4rem;white-space:nowrap}
.pulse{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent);
  animation:pulse-anim 2s infinite}
@keyframes pulse-anim{0%{box-shadow:0 0 0 0 rgba(78,205,196,.6)}70%{box-shadow:0 0 0 10px transparent}100%{box-shadow:0 0 0 0 transparent}}
main{max-width:1280px;margin:0 auto;padding:2rem 1rem}
footer{border-top:1px solid var(--border);margin-top:3rem}
footer .inner{max-width:1280px;margin:0 auto;padding:1.2rem 1rem;
  font-size:.8rem;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
/* ── pages ── */
.page{display:none}.page.active{display:block}
/* ── grids ── */
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.grid-4{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem}
.grid-5{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem}
/* ── cards ── */
.card{border-radius:var(--radius);padding:1.25rem;position:relative;overflow:hidden}
.card h3{font-size:.95rem;font-weight:600;margin-bottom:.25rem}
.card .sub{font-size:.72rem;color:var(--muted);margin-bottom:.75rem}
/* ── metric boxes ── */
.metric{border-radius:var(--radius);padding:1rem;position:relative;overflow:hidden}
.metric .label{font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);
  display:flex;justify-content:space-between;align-items:center}
.metric .val{font-size:1.9rem;font-weight:700;margin-top:.25rem;line-height:1}
.metric .unit{font-size:.8rem;color:var(--muted)}
.metric .hint{font-size:.65rem;color:var(--muted);margin-top:.2rem}
.good{color:var(--accent)}.warn{color:var(--warn)}.danger{color:var(--danger)}
/* ── hero ── */
.hero{padding:4rem 1rem;text-align:center;position:relative}
.hero h1{font-size:clamp(2rem,6vw,4rem);font-weight:800;line-height:1.1;margin:.75rem 0}
.hero p{max-width:560px;margin:.75rem auto 1.5rem;color:var(--muted);font-size:1.05rem}
.hero-btns{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1.4rem;border-radius:8px;
  font-weight:600;font-size:.9rem;cursor:pointer;border:none;transition:.15s;text-decoration:none}
.btn-primary{background:var(--primary);color:#fff;box-shadow:var(--neon-shadow)}
.btn-primary:hover{transform:scale(1.04)}
.btn-outline{background:transparent;color:var(--primary);border:1px solid rgba(91,143,255,.5)}
.btn-outline:hover{background:rgba(91,143,255,.08)}
.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;max-width:600px;margin:2rem auto 0}
@media(max-width:500px){.hero-stats{grid-template-columns:repeat(2,1fr)}}
.stat-box{background:var(--glass-bg);backdrop-filter:blur(12px);border:1px solid var(--border);
  border-radius:var(--radius);padding:1rem;text-align:center}
.stat-box .k{font-size:1.6rem;font-weight:800}.stat-box .l{font-size:.7rem;color:var(--muted)}
/* ── features ── */
.features{max-width:1100px;margin:0 auto;padding:3rem 1rem}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:2rem}
.feat{border-radius:var(--radius);padding:1.4rem}
.feat-icon{width:44px;height:44px;border-radius:10px;background:rgba(91,143,255,.12);
  display:flex;align-items:center;justify-content:center;margin-bottom:.85rem;border:1px solid rgba(91,143,255,.35);font-size:1.3rem}
/* ── chatbot ── */
.chat-box{display:flex;flex-direction:column;height:420px;border-radius:var(--radius);overflow:hidden}
.chat-msgs{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.65rem}
.msg{max-width:80%;padding:.55rem .9rem;border-radius:16px;font-size:.88rem;line-height:1.45}
.msg.ai{background:rgba(91,143,255,.1);border:1px solid rgba(91,143,255,.2);align-self:flex-start}
.msg.user{background:var(--primary);color:#fff;align-self:flex-end;border-radius:16px 16px 4px 16px}
.chat-input{display:flex;gap:.5rem;padding:.65rem;border-top:1px solid var(--border)}
.chat-input input{flex:1;padding:.55rem .85rem;border-radius:8px;border:1px solid var(--border);
  background:rgba(255,255,255,.6);font-size:.88rem;outline:none}
.chat-input input:focus{border-color:var(--primary)}
.chat-input button{padding:.55rem 1rem;border-radius:8px;background:var(--primary);color:#fff;border:none;cursor:pointer}
.suggestions{display:flex;gap:.4rem;padding:.4rem .65rem 0;flex-wrap:wrap}
.sugg{font-size:.72rem;padding:.25rem .65rem;border-radius:999px;border:1px solid rgba(91,143,255,.4);
  color:var(--primary);background:transparent;cursor:pointer}
.sugg:hover{background:rgba(91,143,255,.08)}
/* ── progress bars ── */
.prog-wrap{margin-bottom:.85rem}
.prog-label{display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.3rem}
.prog{height:8px;border-radius:4px;background:rgba(0,0,0,.08);overflow:hidden}
.prog-fill{height:100%;border-radius:4px;transition:width .5s}
/* ── purifier spin ── */
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin 6s linear infinite}
/* ── network nodes ── */
.network-map{position:relative;height:500px;border-radius:var(--radius);overflow:hidden}
.node{position:absolute;transform:translate(-50%,-50%);text-align:center}
.node-dot{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:.75rem;font-weight:700;margin:0 auto}
.node-lbl{font-size:.62rem;color:var(--muted);margin-top:3px;white-space:nowrap}
/* ── charts ── */
.chart-wrap{position:relative;height:260px;margin-top:.5rem}
/* ── mini bar forecast ── */
.mini-bars{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;height:64px;align-items:end;margin-top:.75rem}
.mini-bar{border-radius:3px 3px 0 0;transition:.4s}
/* ── daily bar ── */
.day-bars{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;height:96px;align-items:end}
/* ── util ── */
h1{font-size:clamp(1.5rem,4vw,2.5rem);font-weight:800;letter-spacing:-.02em}
h2{font-size:1.4rem;font-weight:700;letter-spacing:-.015em}
.badge{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .7rem;border-radius:999px;font-size:.72rem}
.tag{display:inline-block;padding:.25rem .65rem;border-radius:999px;font-size:.72rem;
  border:1px solid rgba(91,143,255,.4);color:var(--primary);margin:.2rem .2rem 0 0}
.row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.spacer{flex:1}
@media(max-width:640px){h1{font-size:1.6rem}.hero-stats{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>

<!-- ══════════ HEADER ══════════ -->
<header class="glass">
  <div class="inner">
    <a class="logo" href="#" onclick="nav('home')">
      <svg width="32" height="32" viewBox="0 0 32 32"><defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5b8fff"/><stop offset="100%" stop-color="#4ecdc4"/>
        </linearGradient></defs>
        <circle cx="16" cy="16" r="14" fill="none" stroke="url(#lg1)" stroke-width="2"/>
        <polyline points="4,16 10,10 14,22 18,8 22,16 28,16" fill="none" stroke="url(#lg1)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      AirPulse IoT
    </a>
    <nav id="nav">
      <a href="#" class="active" data-page="home"    onclick="nav('home')">🏠 Home</a>
      <a href="#" data-page="dashboard"  onclick="nav('dashboard')">📊 Dashboard</a>
      <a href="#" data-page="predictions" onclick="nav('predictions')">🧠 ML Predictions</a>
      <a href="#" data-page="purification" onclick="nav('purification')">💨 Purification</a>
      <a href="#" data-page="energy"     onclick="nav('energy')">☀️ Energy</a>
      <a href="#" data-page="network"    onclick="nav('network')">📡 WSN</a>
      <a href="#" data-page="health"     onclick="nav('health')">❤️ Health</a>
      <a href="#" data-page="analytics"  onclick="nav('analytics')">📈 Analytics</a>
      <a href="#" data-page="chatbot"    onclick="nav('chatbot')">💬 AI Chat</a>
      <a href="#" data-page="about"      onclick="nav('about')">ℹ️ About</a>
    </nav>
    <div class="status-pill glass">
      <span class="pulse"></span>
      <span id="hdr-status" style="font-size:.72rem;color:var(--muted)">Live · 12 Nodes</span>
    </div>
  </div>
</header>

<!-- ══════════ PAGES ══════════ -->
<main>

<!-- ─── HOME ─── -->
<div class="page active" id="page-home">
  <div class="hero">
    <span class="badge glass neon-border"><span class="pulse"></span> Next-Gen Environmental Intelligence</span>
    <h1><span class="neon-text">AirPulse IoT</span><br>Breathe Smarter. Live Safer.</h1>
    <p>An AI-powered platform for harmful environment monitoring and smart air purification — combining wireless sensor networks, machine learning, and renewable energy.</p>
    <div class="hero-btns">
      <a class="btn btn-primary" href="#" onclick="nav('dashboard')">Open Live Dashboard</a>
      <a class="btn btn-outline" href="#" onclick="nav('chatbot')">Chat with AirPulse AI</a>
    </div>
    <div class="hero-stats">
      <div class="stat-box"><div class="k neon-text">12</div><div class="l">Sensor Nodes</div></div>
      <div class="stat-box"><div class="k neon-text">98%</div><div class="l">Uptime</div></div>
      <div class="stat-box"><div class="k neon-text">&lt;2s</div><div class="l">Latency</div></div>
      <div class="stat-box"><div class="k neon-text">100%</div><div class="l">Solar Powered</div></div>
    </div>
  </div>

  <div class="features">
    <div style="text-align:center;max-width:520px;margin:0 auto">
      <h2>Engineered for the future of <span class="neon-text">smart cities</span></h2>
      <p style="color:var(--muted);margin-top:.5rem;font-size:.9rem">Twelve integrated subsystems from sensing to AI-driven action.</p>
    </div>
    <div class="feat-grid">
      <div class="feat glass"><div class="feat-icon">📡</div><strong>Real-Time Monitoring</strong><p style="font-size:.83rem;color:var(--muted);margin-top:.4rem">CO₂, AQI, PM2.5/10, temperature, humidity, UV — streamed live from a wireless sensor network.</p></div>
      <div class="feat glass"><div class="feat-icon">🧠</div><strong>ML Predictions</strong><p style="font-size:.83rem;color:var(--muted);margin-top:.4rem">Forecast air quality, hazard scores and pollution accumulation using LSTM and ensemble models.</p></div>
      <div class="feat glass"><div class="feat-icon">💨</div><strong>Smart Purification</strong><p style="font-size:.83rem;color:var(--muted);margin-top:.4rem">Adaptive purifier control that learns pollution patterns and optimizes airflow autonomously.</p></div>
      <div class="feat glass"><div class="feat-icon">☀️</div><strong>Renewable Energy</strong><p style="font-size:.83rem;color:var(--muted);margin-top:.4rem">Solar harvesting, intelligent battery management, and AI power optimization for off-grid operation.</p></div>
      <div class="feat glass"><div class="feat-icon">🌐</div><strong>WSN Mesh</strong><p style="font-size:.83rem;color:var(--muted);margin-top:.4rem">Multi-node mesh with MQTT, gateway routing, and self-healing connectivity.</p></div>
      <div class="feat glass"><div class="feat-icon">💬</div><strong>AI Assistant</strong><p style="font-size:.83rem;color:var(--muted);margin-top:.4rem">Conversational guidance, environmental insights and emergency response — voice-ready.</p></div>
    </div>
  </div>
</div>

<!-- ─── DASHBOARD ─── -->
<div class="page" id="page-dashboard">
  <div class="row" style="margin-bottom:1.25rem;gap:.75rem;flex-wrap:wrap">
    <div>
      <h1>Live <span class="neon-text">Environment</span> Dashboard</h1>
      <p style="color:var(--muted);font-size:.85rem;margin-top:.3rem">Streaming from 12 WSN nodes · MQTT · updated every 2.5s</p>
    </div>
    <div class="spacer"></div>
    <div class="glass neon-border" style="border-radius:var(--radius);padding:.75rem 1.25rem;text-align:center;min-width:110px">
      <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Risk Score</div>
      <div id="db-score" style="font-size:2.4rem;font-weight:800" class="good">--</div>
      <div id="db-label" style="font-size:.8rem" class="good">--</div>
    </div>
  </div>
  <div class="grid-5" id="db-metrics"></div>
  <div class="grid-2" style="margin-top:1rem">
    <div class="card glass"><h3>CO₂ & AQI Trend</h3><div class="sub">Last 60 minutes</div><div class="chart-wrap"><canvas id="ch-co2aqi"></canvas></div></div>
    <div class="card glass"><h3>Particulate Matter</h3><div class="sub">PM2.5 vs PM10</div><div class="chart-wrap"><canvas id="ch-pm"></canvas></div></div>
    <div class="card glass"><h3>Temperature & Humidity</h3><div class="sub">Comfort indicators</div><div class="chart-wrap"><canvas id="ch-th"></canvas></div></div>
    <div class="card glass"><h3>Energy</h3><div class="sub">Solar harvest vs battery</div><div class="chart-wrap"><canvas id="ch-energy"></canvas></div></div>
  </div>
</div>

<!-- ─── ML PREDICTIONS ─── -->
<div class="page" id="page-predictions">
  <div style="margin-bottom:1.5rem">
    <h1>🧠 ML <span class="neon-text">Prediction</span> Center</h1>
    <p style="color:var(--muted);margin-top:.3rem;font-size:.88rem">Forecasts powered by LSTM, Random Forest, Decision Trees and ensemble anomaly detection.</p>
  </div>
  <div class="card glass neon-border row" style="margin-bottom:1.25rem;gap:1rem;flex-wrap:wrap">
    <span style="font-size:1.4rem">✨</span>
    <div style="flex:1;min-width:200px">
      <strong>AI Insight</strong>
      <p id="pred-insight" style="font-size:.85rem;color:var(--muted);margin-top:.2rem">Loading…</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:.7rem;color:var(--muted)">Confidence</div>
      <div id="pred-conf" style="font-size:1.8rem;font-weight:800;color:var(--accent)">--</div>
    </div>
  </div>
  <div class="card glass" style="margin-bottom:1.25rem">
    <h3>CO₂ Forecast — Past 12 min + LSTM 60-min projection</h3>
    <div class="chart-wrap"><canvas id="ch-forecast"></canvas></div>
  </div>
  <div class="grid-4" style="margin-bottom:1.25rem">
    <div class="card glass"><div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Model</div><strong>LSTM Time-Series</strong><p style="font-size:.78rem;color:var(--muted);margin:.3rem 0 .6rem">CO₂ next 60 min</p><div class="prog-wrap"><div class="prog-label"><span style="font-size:.72rem;color:var(--muted)">Accuracy</span><span class="good" style="font-size:.72rem">94%</span></div><div class="prog"><div class="prog-fill good" style="width:94%;background:var(--primary)"></div></div></div></div>
    <div class="card glass"><div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Model</div><strong>Random Forest</strong><p style="font-size:.78rem;color:var(--muted);margin:.3rem 0 .6rem">AQI trend</p><div class="prog-wrap"><div class="prog-label"><span style="font-size:.72rem;color:var(--muted)">Accuracy</span><span class="good" style="font-size:.72rem">91%</span></div><div class="prog"><div class="prog-fill" style="width:91%;background:var(--accent)"></div></div></div></div>
    <div class="card glass"><div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Model</div><strong>Isolation Forest</strong><p style="font-size:.78rem;color:var(--muted);margin:.3rem 0 .6rem">Anomaly detection</p><div class="prog-wrap"><div class="prog-label"><span style="font-size:.72rem;color:var(--muted)">Accuracy</span><span class="warn" style="font-size:.72rem">96%</span></div><div class="prog"><div class="prog-fill" style="width:96%;background:var(--warn)"></div></div></div></div>
    <div class="card glass"><div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Model</div><strong>K-Means</strong><p style="font-size:.78rem;color:var(--muted);margin:.3rem 0 .6rem">Pollution clustering</p><div class="prog-wrap"><div class="prog-label"><span style="font-size:.72rem;color:var(--muted)">Accuracy</span><span class="good" style="font-size:.72rem">88%</span></div><div class="prog"><div class="prog-fill" style="width:88%;background:var(--primary)"></div></div></div></div>
  </div>
  <div class="card glass" style="margin-bottom:1.25rem">
    <h3>⚠️ Anomaly Detection — Isolation Forest scanning live stream</h3>
    <div class="grid-3" style="margin-top:.75rem">
      <div class="card" style="background:rgba(0,0,0,.04);border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--muted)">Sensors monitored</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">12</div></div>
      <div class="card" style="background:rgba(0,0,0,.04);border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--muted)">Anomalies (24h)</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">3</div></div>
      <div class="card" style="background:rgba(0,0,0,.04);border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--muted)">False positives</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">0.4%</div></div>
    </div>
  </div>
  <!-- Report Generator -->
  <div class="card glass">
    <h3>🔬 Manual Hazard Report Generator</h3>
    <p style="font-size:.8rem;color:var(--muted);margin:.3rem 0 .9rem">Enter sensor readings — get a 60-minute hazard forecast and download a printable report.</p>
    <div class="grid-5">
      <div><label style="font-size:.72rem;color:var(--muted)">CO₂ (ppm)</label><br><input id="rg-co2" type="number" value="650" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1px solid var(--border);background:rgba(255,255,255,.6);margin-top:.3rem"></div>
      <div><label style="font-size:.72rem;color:var(--muted)">PM2.5 (µg/m³)</label><br><input id="rg-pm" type="number" value="35" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1px solid var(--border);background:rgba(255,255,255,.6);margin-top:.3rem"></div>
      <div><label style="font-size:.72rem;color:var(--muted)">Temperature (°C)</label><br><input id="rg-temp" type="number" value="26" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1px solid var(--border);background:rgba(255,255,255,.6);margin-top:.3rem"></div>
      <div><label style="font-size:.72rem;color:var(--muted)">Humidity (%)</label><br><input id="rg-hum" type="number" value="55" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1px solid var(--border);background:rgba(255,255,255,.6);margin-top:.3rem"></div>
      <div><label style="font-size:.72rem;color:var(--muted)">Location</label><br><input id="rg-loc" type="text" value="Lab Room A" style="width:100%;padding:.45rem .6rem;border-radius:7px;border:1px solid var(--border);background:rgba(255,255,255,.6);margin-top:.3rem"></div>
    </div>
    <div class="row" style="margin-top:1rem;gap:.75rem">
      <div id="rg-verdict" style="font-size:.82rem;color:var(--muted)">Preview will appear here…</div>
      <div class="spacer"></div>
      <button class="btn btn-primary" onclick="downloadReport()">⬇ Download Report</button>
    </div>
    <div style="margin-top:.6rem" id="rg-preview-text" style="font-size:.78rem;color:var(--muted)"></div>
  </div>
</div>

<!-- ─── PURIFICATION ─── -->
<div class="page" id="page-purification">
  <h1>💨 Smart <span class="neon-text">Air Purification</span></h1>
  <p style="color:var(--muted);margin:.3rem 0 1.5rem;font-size:.88rem">Self-learning purifier that adapts to live pollution patterns.</p>
  <div class="grid-2" style="margin-bottom:1.25rem">
    <div class="card glass">
      <div class="row">
        <div><div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em">Purifier Status</div>
          <div id="pur-status" style="font-size:1.5rem;font-weight:800;margin-top:.2rem">--</div>
        </div>
        <div class="spacer"></div>
        <div id="pur-icon" style="width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;border:2px solid rgba(91,143,255,.4)">💨</div>
      </div>
      <div style="margin-top:1.25rem" id="pur-bars"></div>
    </div>
    <div class="card glass" style="min-height:320px;position:relative;overflow:hidden">
      <h3>⚡ Live Airflow Simulation</h3>
      <p class="sub">Polluted particles being cycled through HEPA + activated carbon stage.</p>
      <div id="particles" style="position:absolute;bottom:0;left:0;right:0;height:200px;pointer-events:none"></div>
      <div class="grid-3" id="pur-mini" style="position:absolute;bottom:1rem;left:1rem;right:1rem"></div>
    </div>
  </div>
  <!-- Forecast -->
  <div class="card glass" style="margin-bottom:1.25rem">
    <div class="row" style="flex-wrap:wrap;gap:.75rem">
      <div><h3>🧠 1-Hour Hazard Forecast <span style="font-size:.65rem;border:1px solid rgba(91,143,255,.4);padding:.2rem .5rem;border-radius:999px;margin-left:.4rem">LSTM · Edge Inference</span></h3>
        <p class="sub">Predictive model trained on rolling sensor windows.</p></div>
      <div class="spacer"></div>
      <div id="pur-level" class="badge glass neon-border">--</div>
    </div>
    <div class="grid-4" id="pur-tiles" style="margin-top:.75rem"></div>
    <div style="margin-top:.75rem;padding:.9rem;border-radius:10px;background:rgba(0,0,0,.04);border:1px solid var(--border)">
      <p id="pur-ai-insight" style="font-size:.85rem;color:var(--muted)">Loading…</p>
      <div class="mini-bars" id="pur-mini-bars" style="margin-top:.5rem"></div>
    </div>
  </div>
  <div class="grid-3">
    <div class="card glass"><div style="font-size:.65rem;text-transform:uppercase;color:var(--muted)">Bio-Carbon Filter Life</div><div id="pur-filter" class="neon-text" style="font-size:2rem;font-weight:800">--</div><p style="font-size:.75rem;color:var(--muted);margin-top:.4rem">Algae-infused HEPA stage — regenerates O₂ from absorbed CO₂.</p></div>
    <div class="card glass"><div style="font-size:.65rem;text-transform:uppercase;color:var(--muted)">Auto-Vent Bridge</div><div id="pur-vent" style="font-size:2rem;font-weight:800;color:var(--accent)">AUTO</div><p style="font-size:.75rem;color:var(--muted);margin-top:.4rem">Cross-room mesh sync — redirects clean air to high-occupancy zones.</p></div>
    <div class="card glass"><div style="font-size:.65rem;text-transform:uppercase;color:var(--muted)">Solar-Assist Mode</div><div id="pur-solar" style="font-size:2rem;font-weight:800;color:var(--primary)">--</div><p style="font-size:.75rem;color:var(--muted);margin-top:.4rem">Renewable harvest covers current draw.</p></div>
  </div>
</div>

<!-- ─── ENERGY ─── -->
<div class="page" id="page-energy">
  <h1>☀️ <span class="neon-text">Renewable</span> Energy</h1>
  <p style="color:var(--muted);margin:.3rem 0 1.5rem;font-size:.88rem">Solar-harvested power with AI-optimized battery management for off-grid operation.</p>
  <div class="grid-4" id="energy-stats" style="margin-bottom:1.25rem"></div>
  <div class="card glass" style="margin-bottom:1.25rem">
    <h3>Solar Harvest vs Battery</h3>
    <div class="chart-wrap"><canvas id="ch-energy2"></canvas></div>
  </div>
  <div class="card glass">
    <h3>🌱 AI Power Optimization</h3>
    <ul style="margin-top:.75rem;font-size:.85rem;color:var(--muted);line-height:2;list-style:none">
      <li>• Predicted battery drain: 12% in next 4h — within safe range.</li>
      <li>• Low-power mode armed for nodes #7 and #11 (low solar exposure).</li>
      <li>• Scheduled purifier ramp-up aligned with peak solar window (12:00–14:00).</li>
      <li>• Estimated 100% renewable autonomy for the next 36 hours.</li>
    </ul>
  </div>
</div>

<!-- ─── WSN ─── -->
<div class="page" id="page-network">
  <h1>📡 Wireless <span class="neon-text">Sensor Network</span></h1>
  <p style="color:var(--muted);margin:.3rem 0 1.5rem;font-size:.88rem">Mesh topology · MQTT broker · Cloud relay · self-healing routes.</p>
  <div class="network-map glass" style="margin-bottom:1.25rem" id="net-map">
    <svg id="net-lines" style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
    <div id="net-gateway" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;text-align:center">
      <div style="width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;border:2px solid rgba(91,143,255,.5);background:rgba(255,255,255,.8);margin:0 auto">☁️</div>
      <div style="font-size:.72rem;color:var(--primary);margin-top:.3rem;white-space:nowrap">Gateway / MQTT</div>
    </div>
    <div id="net-nodes"></div>
  </div>
  <div class="grid-4">
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Total Nodes</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">12</div></div>
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Online</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">11</div></div>
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Avg Latency</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">184 ms</div></div>
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Packet Loss</div><div class="neon-text" style="font-size:1.8rem;font-weight:800">0.3%</div></div>
  </div>
</div>

<!-- ─── HEALTH ─── -->
<div class="page" id="page-health">
  <h1>❤️ AI <span class="neon-text">Health Impact</span> Analyzer</h1>
  <p style="color:var(--muted);margin:.3rem 0 1.5rem;font-size:.88rem">ML inference of human comfort and exposure risk based on live conditions.</p>
  <div class="grid-2" style="margin-bottom:1.25rem">
    <div class="card glass" style="text-align:center">
      <div style="font-size:.7rem;text-transform:uppercase;color:var(--muted)">Comfort Index</div>
      <div id="hlth-comfort" class="neon-text" style="font-size:4rem;font-weight:800;margin:.5rem 0">--</div>
      <div id="hlth-comfort-lbl" style="font-size:.85rem;color:var(--muted)">--</div>
    </div>
    <div class="card glass" id="hlth-bars"></div>
  </div>
  <div class="grid-3">
    <div class="card glass"><div style="font-size:1.3rem">💨</div><strong style="display:block;margin:.5rem 0 .25rem">Safe Exposure</strong><div id="hlth-safe" class="neon-text" style="font-size:2rem;font-weight:800">--</div><p style="font-size:.75rem;color:var(--muted);margin-top:.3rem">Estimated time before recommended ventilation break.</p></div>
    <div class="card glass"><div style="font-size:1.3rem">🧠</div><strong style="display:block;margin:.5rem 0 .25rem">AI Recommendation</strong><p id="hlth-rec" style="font-size:.85rem;color:var(--muted)">--</p></div>
    <div class="card glass"><div style="font-size:1.3rem">💙</div><strong style="display:block;margin:.5rem 0 .25rem">Vulnerable Group Alert</strong><p id="hlth-vuln" style="font-size:.85rem;color:var(--muted)">--</p></div>
  </div>
</div>

<!-- ─── ANALYTICS ─── -->
<div class="page" id="page-analytics">
  <div class="row" style="margin-bottom:1.25rem;flex-wrap:wrap;gap:.75rem">
    <div><h1>📊 Historical <span class="neon-text">Analytics</span></h1><p style="color:var(--muted);margin-top:.3rem;font-size:.85rem">Trends, reports and exports.</p></div>
    <div class="spacer"></div>
    <button class="btn btn-outline" onclick="exportCsv()">⬇ Export CSV</button>
  </div>
  <div class="card glass" style="margin-bottom:1.25rem">
    <h3>Weekly AQI & CO₂ Averages</h3>
    <div class="chart-wrap" style="height:320px"><canvas id="ch-weekly"></canvas></div>
  </div>
  <div class="grid-3">
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Average AQI (7d)</div><div class="neon-text" style="font-size:2.2rem;font-weight:800">72</div></div>
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Peak CO₂ (7d)</div><div class="neon-text" style="font-size:2.2rem;font-weight:800">942 ppm</div></div>
    <div class="card glass"><div style="font-size:.7rem;color:var(--muted)">Hazard Events</div><div class="neon-text" style="font-size:2.2rem;font-weight:800">4</div></div>
  </div>
</div>

<!-- ─── CHATBOT ─── -->
<div class="page" id="page-chatbot">
  <h1>💬 AirPulse <span class="neon-text">AI Assistant</span></h1>
  <p style="color:var(--muted);margin:.3rem 0 1.25rem;font-size:.88rem">Sensor-aware conversational guidance · multilingual ready · voice optional.</p>
  <div class="glass" style="border-radius:var(--radius);max-width:860px">
    <div class="chat-box">
      <div class="chat-msgs" id="chat-msgs"></div>
      <div class="suggestions" id="chat-suggs"></div>
      <div class="chat-input">
        <input id="chat-in" placeholder="Ask about air quality, predictions, or safety…" onkeydown="if(event.key==='Enter')chatSend()">
        <button onclick="chatSend()">➤</button>
      </div>
    </div>
  </div>
</div>

<!-- ─── ABOUT ─── -->
<div class="page" id="page-about">
  <h1>About <span class="neon-text">AirPulse IoT</span></h1>
  <p style="color:var(--muted);margin:.75rem 0 2rem;font-size:1rem;max-width:700px">A next-generation AI-powered platform for harmful environment monitoring and smart air purification — built on wireless sensor networks, IoT, machine learning, and renewable energy.</p>
  <div class="grid-2" style="margin-bottom:1.5rem">
    <div class="card glass"><span style="font-size:1.3rem">💻</span><strong style="display:block;margin:.5rem 0 .25rem">Edge + Cloud Architecture</strong><p style="font-size:.85rem;color:var(--muted)">ESP32 sensor nodes → MQTT broker → Firebase / cloud analytics → ML inference.</p></div>
    <div class="card glass"><span style="font-size:1.3rem">🌱</span><strong style="display:block;margin:.5rem 0 .25rem">Renewable First</strong><p style="font-size:.85rem;color:var(--muted)">Solar harvesting with adaptive low-power mode for true off-grid deployment.</p></div>
    <div class="card glass"><span style="font-size:1.3rem">🛡</span><strong style="display:block;margin:.5rem 0 .25rem">Predict-then-Protect</strong><p style="font-size:.85rem;color:var(--muted)">Forecast hazards before they occur and trigger autonomous purification responses.</p></div>
    <div class="card glass"><span style="font-size:1.3rem">🎓</span><strong style="display:block;margin:.5rem 0 .25rem">Research Ready</strong><p style="font-size:.85rem;color:var(--muted)">Designed for IEEE projects, smart-city pilots, and sustainable engineering research.</p></div>
  </div>
  <div class="card glass" style="margin-bottom:1.5rem">
    <h2 style="margin-bottom:.75rem">Tech Stack</h2>
    <div>
      <span class="tag">React</span><span class="tag">Tailwind CSS</span><span class="tag">Python</span><span class="tag">Flask</span><span class="tag">Scikit-learn</span><span class="tag">TensorFlow</span><span class="tag">LSTM</span><span class="tag">Firebase</span><span class="tag">MongoDB</span><span class="tag">MQTT</span><span class="tag">WebSockets</span><span class="tag">ESP32</span><span class="tag">LoRa</span>
    </div>
  </div>
  <div class="card glass">
    <h2 style="margin-bottom:.75rem">Deployment Targets</h2>
    <ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.5rem;font-size:.88rem;color:var(--muted);list-style:none">
      <li>• Smart classrooms & libraries</li><li>• Hospitals & clinics</li>
      <li>• Bus stops & transit hubs</li><li>• Construction sites</li>
      <li>• Rural health centers</li><li>• Industrial monitoring</li>
    </ul>
  </div>
</div>

</main>

<footer class="glass">
  <div class="inner">
    <span>© 2025 AirPulse IoT — Intelligent Environment Monitoring</span>
    <span>Powered by WSN · IoT · AI · Renewable Energy</span>
  </div>
</footer>

<!-- ══════════ JAVASCRIPT ══════════ -->
<script>
// ── chart registry ──────────────────────────────────────────────────────────
const charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function makeLineChart(canvasId, labels, datasets) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      animation: false,
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#6b7280', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: 'rgba(0,0,0,.06)' } },
        y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.06)' } }
      }
    }
  });
}

function makeBarChart(canvasId, labels, datasets) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#6b7280', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } },
        y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } }
      }
    }
  });
}

// ── sensor state ────────────────────────────────────────────────────────────
let sensorData = { latest: null, history: [], score: 0 };

function riskLabel(score) {
  if (score >= 90) return { label: 'Excellent', cls: 'good' };
  if (score >= 70) return { label: 'Safe', cls: 'good' };
  if (score >= 40) return { label: 'Moderate Risk', cls: 'warn' };
  return { label: 'Dangerous', cls: 'danger' };
}

function statusClass(val, warnT, dangerT) {
  if (val >= dangerT) return 'danger';
  if (val >= warnT)   return 'warn';
  return 'good';
}

// ── SSE live updates ─────────────────────────────────────────────────────────
const es = new EventSource('/api/sensors/stream');
es.onmessage = function(e) {
  const d = JSON.parse(e.data);
  sensorData = d;
  refreshCurrentPage();
};

// ── nav ──────────────────────────────────────────────────────────────────────
let currentPage = 'home';

function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`nav a[data-page="${page}"]`)?.classList.add('active');
  currentPage = page;
  // initial render
  refreshCurrentPage();
  return false;
}

function refreshCurrentPage() {
  if (!sensorData.latest) return;
  const fn = pageRenderers[currentPage];
  if (fn) fn();
}

// ── page renderers ────────────────────────────────────────────────────────────
const pageRenderers = {
  home: renderHome,
  dashboard: renderDashboard,
  predictions: renderPredictions,
  purification: renderPurification,
  energy: renderEnergy,
  network: renderNetwork,
  health: renderHealth,
  analytics: renderAnalytics,
  chatbot: renderChatbot,
  about: ()=>{},
};

// HOME
function renderHome() {}

// DASHBOARD
function renderDashboard() {
  const { latest, history, score } = sensorData;
  if (!latest) return;
  const r = riskLabel(score);
  document.getElementById('db-score').textContent = score;
  document.getElementById('db-score').className = r.cls;
  document.getElementById('db-label').textContent = r.label;
  document.getElementById('db-label').className = r.cls;

  const metrics = [
    { label:'CO₂', val:latest.co2, unit:'ppm', status:statusClass(latest.co2,700,1000), hint:'Safe < 700' },
    { label:'AQI', val:latest.aqi, unit:'', status:statusClass(latest.aqi,80,150), hint:'EPA scale' },
    { label:'PM2.5', val:latest.pm25, unit:'µg/m³', status:statusClass(latest.pm25,25,55) },
    { label:'PM10', val:latest.pm10, unit:'µg/m³', status:statusClass(latest.pm10,50,150) },
    { label:'Temperature', val:latest.temp, unit:'°C', status:statusClass(latest.temp,28,32) },
    { label:'Humidity', val:latest.humidity, unit:'%', status:'good' },
    { label:'UV Index', val:latest.uv, unit:'', status:'good' },
    { label:'Smoke', val:latest.smoke, unit:'ppm', status:latest.smoke>40?'danger':'good' },
    { label:'Occupancy', val:latest.occupancy, unit:'ppl', status:'good' },
    { label:'Battery', val:latest.battery, unit:'%', status:latest.battery<50?'warn':'good' },
  ];
  document.getElementById('db-metrics').innerHTML = metrics.map(m => `
    <div class="metric glass">
      <div class="label">${m.label}</div>
      <div class="val ${m.status}">${m.val}<span class="unit"> ${m.unit}</span></div>
      ${m.hint?`<div class="hint">${m.hint}</div>`:''}
    </div>`).join('');

  const labels = history.map(h=>h.time);
  makeLineChart('ch-co2aqi', labels, [
    { label:'CO₂', data:history.map(h=>h.co2), borderColor:'#5b8fff', backgroundColor:'rgba(91,143,255,.18)', fill:true, tension:.4, pointRadius:0 },
    { label:'AQI', data:history.map(h=>h.aqi), borderColor:'#4ecdc4', backgroundColor:'rgba(78,205,196,.12)', fill:true, tension:.4, pointRadius:0 },
  ]);
  makeLineChart('ch-pm', labels, [
    { label:'PM2.5', data:history.map(h=>h.pm25), borderColor:'#f0a020', pointRadius:0, tension:.4 },
    { label:'PM10', data:history.map(h=>h.pm10), borderColor:'#e74c3c', pointRadius:0, tension:.4 },
  ]);
  makeLineChart('ch-th', labels, [
    { label:'Temp °C', data:history.map(h=>h.temp), borderColor:'#f0a020', pointRadius:0, tension:.4 },
    { label:'Humidity %', data:history.map(h=>h.humidity), borderColor:'#5b8fff', pointRadius:0, tension:.4 },
  ]);
  makeLineChart('ch-energy', labels, [
    { label:'Solar W', data:history.map(h=>h.solar), borderColor:'#f0a020', backgroundColor:'rgba(240,160,32,.2)', fill:true, pointRadius:0, tension:.4 },
    { label:'Battery %', data:history.map(h=>h.battery), borderColor:'#4ecdc4', pointRadius:0, tension:.4 },
  ]);
}

// PREDICTIONS
function renderPredictions() {
  const { latest, history } = sensorData;
  if (!latest) return;
  const n = history.length;
  const trendCo2 = n>=10 ? (history[n-1].co2 - history[Math.max(0,n-10)].co2)/10 : 0;
  const future = Array.from({length:12},(_,i)=>({
    time:`+${(i+1)*5}m`,
    co2: Math.max(380, Math.round(latest.co2 + trendCo2*(i+1) + (Math.random()-.5)*30)),
    aqi: Math.max(20,  Math.round(latest.aqi + (i+1)*2 + (Math.random()-.5)*8)),
  }));
  const breach = future.find(f=>f.co2>1000);
  const conf = 87 + Math.round(Math.random()*8);
  document.getElementById('pred-insight').textContent = breach
    ? `Warning: CO₂ projected to exceed safe threshold (~${breach.co2} ppm) within ${breach.time}. Activate purifier.`
    : `Air quality predicted stable for the next 60 minutes. AQI within healthy range.`;
  document.getElementById('pred-conf').textContent = conf + '%';

  const past = history.slice(-12).map(h=>({ time:h.time, co2:h.co2, pred:null }));
  const futureMerged = future.map(f=>({ time:f.time, co2:null, pred:f.co2 }));
  const merged = [...past,...futureMerged];
  makeLineChart('ch-forecast', merged.map(m=>m.time), [
    { label:'Actual CO₂', data:merged.map(m=>m.co2), borderColor:'#5b8fff', backgroundColor:'rgba(91,143,255,.18)', fill:true, tension:.4, pointRadius:0 },
    { label:'Predicted CO₂', data:merged.map(m=>m.pred), borderColor:'#4ecdc4', borderDash:[5,4], backgroundColor:'rgba(78,205,196,.12)', fill:true, tension:.4, pointRadius:0 },
  ]);

  // live preview for report generator
  updateReportPreview();
}

// Report Generator helpers
function computeReport() {
  const c=parseFloat(document.getElementById('rg-co2').value)||650;
  const p=parseFloat(document.getElementById('rg-pm').value)||35;
  const t=parseFloat(document.getElementById('rg-temp').value)||26;
  const h=parseFloat(document.getElementById('rg-hum').value)||55;
  const drift=(c-420)*0.02+p*0.6+Math.max(0,t-28)*4;
  const pts=Array.from({length:12},(_,i)=>{
    const m=(i+1)*5;
    const co2F=Math.max(380,Math.round(c+drift*(i+1)*0.35));
    const pmF=Math.max(0,Math.round(p+(drift/18)*(i+1)));
    const aqiF=Math.min(400,Math.round(pmF*1.8+(co2F-400)*0.05));
    return{m,co2:co2F,pm:pmF,aqi:aqiF};
  });
  const breach=pts.find(x=>x.co2>1000||x.aqi>150);
  const finalPt=pts[pts.length-1];
  const status=!breach?'SAFE':breach.m<=20?'CRITICAL':breach.m<=40?'HIGH RISK':'CAUTION';
  return{c,p,t,h,pts,breach,finalPt,status};
}

function updateReportPreview(){
  const r=computeReport();
  const vc=document.getElementById('rg-verdict');
  if(!vc)return;
  const cls=r.status==='SAFE'?'good':r.status==='CRITICAL'?'danger':'warn';
  vc.innerHTML=`Verdict: <strong class="${cls}">${r.status}</strong> ${r.breach?`— breach predicted in <strong>+${r.breach.m} min</strong>`:`— stays safe through +60 min`}`;
}

document.addEventListener('input',e=>{
  if(['rg-co2','rg-pm','rg-temp','rg-hum'].includes(e.target.id)) updateReportPreview();
});

function downloadReport(){
  const r=computeReport();
  const loc=document.getElementById('rg-loc').value||'—';
  const id='APR-'+Date.now().toString(36).toUpperCase();
  const now=new Date().toLocaleString();
  const sc=r.status==='SAFE'?'#1f8a4c':r.status==='CAUTION'?'#b07d00':r.status==='HIGH RISK'?'#c45a00':'#a8201a';
  const safeMsg=r.breach
    ?`Air quality is within acceptable range, however a breach is forecast in ~${r.breach.m} min (CO₂ ≈${r.breach.co2} ppm, AQI ≈${r.breach.aqi}). Pre-emptive ventilation recommended.`
    :`Predicted air quality remains within safe operating limits for the next 60 minutes.`;
  const rows=r.pts.map(x=>`<tr><td>+${x.m} min</td><td>${x.co2} ppm</td><td>${x.pm} µg/m³</td><td>${x.aqi}</td><td>${x.co2>1000||x.aqi>150?"<span style='color:#c0392b;font-weight:700'>BREACH</span>":"OK"}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>AirPulse IoT — Hazard Report ${id}</title>
<style>*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,sans-serif;color:#1a1f2c;background:#f6f8fb;padding:32px}
.wrap{max-width:840px;margin:0 auto;background:#fff;border-radius:14px;padding:36px;box-shadow:0 8px 32px rgba(20,40,80,.08)}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #eef1f6;padding-bottom:18px;margin-bottom:22px}
h1{margin:0;font-size:22px}
.sub{color:#5a6478;font-size:12px;margin-top:4px}
.badge{display:inline-block;padding:8px 14px;border-radius:999px;color:#fff;font-weight:700;font-size:13px;background:${sc}}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eef1f6}
th{background:#f0f4fa;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
.cell{background:#f6f8fb;border-radius:10px;padding:12px}.cell .l{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em}.cell .v{font-size:18px;font-weight:700;margin-top:4px}
.note{background:#fff7e6;border-left:4px solid #f0a020;padding:12px 14px;border-radius:8px;margin:18px 0;font-size:13px;line-height:1.55}
h3{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#5a6478;margin:24px 0 8px}
.foot{margin-top:28px;padding-top:14px;border-top:1px solid #eef1f6;font-size:11px;color:#8892a6;display:flex;justify-content:space-between}
</style></head><body><div class="wrap">
<div class="head"><div><h1>AirPulse IoT — Hourly Hazard Forecast</h1><div class="sub">Report ID: ${id} · Generated: ${now}</div><div class="sub">Location: ${loc}</div></div><div class="badge">${r.status}</div></div>
<h3>Input Readings</h3><div class="grid"><div class="cell"><div class="l">CO₂</div><div class="v">${r.c} ppm</div></div><div class="cell"><div class="l">PM2.5</div><div class="v">${r.p} µg/m³</div></div><div class="cell"><div class="l">Temperature</div><div class="v">${r.t} °C</div></div><div class="cell"><div class="l">Humidity</div><div class="v">${r.h} %</div></div></div>
<h3>Executive Summary</h3><div class="note">${safeMsg}</div>
<h3>60-Minute Forecast</h3><table><thead><tr><th>Horizon</th><th>CO₂</th><th>PM2.5</th><th>AQI</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<div class="foot"><span>AirPulse IoT · Predictive Environmental Intelligence</span><span>Model: LSTM-trend ensemble · v1.2</span></div>
</div></body></html>`;
  const a=document.createElement('a');
  a.href='data:text/html;charset=utf-8,'+encodeURIComponent(html);
  a.download=`airpulse-report-${id}.html`;
  a.click();
}

// PURIFICATION
function renderPurification() {
  const { latest, history } = sensorData;
  if (!latest) return;
  const pollution = Math.min(100, Math.round((latest.aqi/200)*100 + latest.co2/30));
  const efficiency = Math.max(60, 100 - Math.round(pollution/4));
  const oxygen = Math.min(100, 100 - pollution + 20);
  const isActive = pollution > 35;

  document.getElementById('pur-status').textContent = isActive ? 'ACTIVE' : 'STANDBY';
  document.getElementById('pur-status').style.color = isActive ? 'var(--accent)' : 'var(--muted)';
  const icon = document.getElementById('pur-icon');
  icon.style.borderColor = isActive ? 'var(--accent)' : 'rgba(91,143,255,.3)';
  icon.style.animation = isActive ? 'spin 6s linear infinite' : 'none';

  document.getElementById('pur-bars').innerHTML = [
    { label:'Purification Efficiency', val:efficiency, color:'var(--accent)' },
    { label:'Oxygen Flow', val:oxygen, color:'var(--primary)' },
    { label:'CO₂ Absorption', val:Math.min(100,Math.round(latest.co2/14)), color:'var(--accent)' },
  ].map(b=>`<div class="prog-wrap">
    <div class="prog-label"><span style="font-size:.82rem;color:var(--muted)">${b.label}</span><span style="color:${b.color};font-weight:600">${Math.round(b.val)}%</span></div>
    <div class="prog"><div class="prog-fill" style="width:${b.val}%;background:${b.color};box-shadow:0 0 8px ${b.color}"></div></div>
  </div>`).join('');

  document.getElementById('pur-mini').innerHTML = [
    { label:'Particles in', val:pollution },
    { label:'Filtered', val:Math.round(pollution*(efficiency/100)) },
    { label:'Clean out', val:Math.max(0,pollution-Math.round(pollution*(efficiency/100))) },
  ].map(m=>`<div class="card glass" style="text-align:center;padding:.6rem">
    <div style="font-size:.62rem;text-transform:uppercase;color:var(--muted)">${m.label}</div>
    <div class="neon-text" style="font-size:1.4rem;font-weight:800">${m.val}</div>
  </div>`).join('');

  // forecast
  const n=history.length;
  const pts=history.slice(-20);
  const xs=pts.map((_,i)=>i);
  const co2s=pts.map(p=>p.co2);
  const mx=xs.reduce((a,b)=>a+b,0)/Math.max(pts.length,1);
  const my=co2s.reduce((a,b)=>a+b,0)/Math.max(pts.length,1);
  const num=xs.reduce((s,x,i)=>s+(x-mx)*(co2s[i]-my),0);
  const den=xs.reduce((s,x)=>s+(x-mx)**2,0)||1;
  const slope=num/den;
  const horizon=24;
  const co2F=Math.round(Math.max(380,Math.min(1800,latest.co2+slope*horizon)));
  const aqiF=Math.max(10,Math.min(380,latest.aqi+(latest.aqi-history[Math.max(0,n-10)].aqi)/10*horizon));
  const delta=co2F-latest.co2;
  const conf=Math.min(99,70+Math.round(Math.abs(slope)*4));
  let level='Safe';
  if(co2F>1200||aqiF>200) level='Critical';
  else if(co2F>900||aqiF>140) level='High Risk';
  else if(co2F>700||aqiF>100) level='Caution';
  const levelCls=level==='Critical'?'danger':level==='High Risk'||level==='Caution'?'warn':'good';
  document.getElementById('pur-level').textContent = level;
  document.getElementById('pur-level').className = 'badge glass neon-border ' + levelCls;
  document.getElementById('pur-tiles').innerHTML=[
    {label:'Now CO₂',val:latest.co2,unit:'ppm',hi:false},
    {label:'In 60 min',val:co2F,unit:'ppm',hi:true},
    {label:'Δ Trend',val:(delta>=0?'+':'')+delta,unit:'ppm',hi:false},
    {label:'Confidence',val:conf,unit:'%',hi:false},
  ].map(t=>`<div class="card ${t.hi?'glass neon-border':'glass'}" style="padding:.85rem;${t.hi?'border-color:var(--primary)':''}">
    <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">${t.label}</div>
    <div style="font-size:1.6rem;font-weight:800;margin-top:.2rem;${t.hi?'color:var(--primary)':''}">${t.val}<span style="font-size:.75rem;color:var(--muted)"> ${t.unit}</span></div>
  </div>`).join('');

  const insights={
    'Safe':'Air quality is projected to remain within safe limits for the next hour.',
    'Caution':`CO₂ trending up — expected to reach ${co2F} ppm. Boosting filter cycle.`,
    'High Risk':`High CO₂ emission risk. Auto-engaging deep purification.`,
    'Critical':`Critical hazard predicted (CO₂ ${co2F} ppm). Ventilation override triggered.`,
  };
  document.getElementById('pur-ai-insight').innerHTML = `<strong>⚡ AI Insight:</strong> ${insights[level]}`;

  // mini bars
  const bars=document.getElementById('pur-mini-bars');
  bars.innerHTML=Array.from({length:12},(_,i)=>{
    const t=(i+1)/12;
    const v=latest.co2+(co2F-latest.co2)*t;
    const h=Math.min(100,Math.max(8,((v-380)/1000)*100));
    const danger=v>1000;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:100%;border-radius:3px 3px 0 0;height:${h}%;background:${danger?'linear-gradient(to top,#e74c3c,#f0a020)':'linear-gradient(to top,rgba(91,143,255,.6),rgba(78,205,196,.8))'};${danger?'box-shadow:0 0 8px #e74c3c':''}"></div>
      <span style="font-size:9px;color:var(--muted)">+${(i+1)*5}m</span>
    </div>`;
  }).join('');

  document.getElementById('pur-filter').textContent = Math.max(12,100-Math.round(pollution*0.6))+'%';
  document.getElementById('pur-vent').textContent = level==='Critical'?'OPEN':'AUTO';
  document.getElementById('pur-solar').textContent = latest.solar>50?'GREEN':'GRID';
  document.getElementById('pur-solar').innerHTML += `<p style="font-size:.75rem;color:var(--muted);font-weight:400;margin-top:.2rem">Renewable harvest covers ${latest.solar}% of current draw.</p>`;
}

// ENERGY
let energyChartInit = false;
function renderEnergy() {
  const { latest, history } = sensorData;
  if (!latest) return;
  const totalHarvest = history.reduce((s,r)=>s+r.solar,0);
  const eff = Math.round((latest.solar/100)*100);
  document.getElementById('energy-stats').innerHTML=[
    {label:'Battery',val:`${latest.battery}%`,color:'var(--accent)'},
    {label:'Solar Output',val:`${latest.solar} W`,color:'var(--warn)'},
    {label:'Today Harvest',val:`${(totalHarvest/60).toFixed(1)} kWh`,color:'var(--primary)'},
    {label:'Renewable Score',val:`${eff}%`,color:'var(--accent)'},
  ].map(s=>`<div class="card glass">
    <div style="font-size:.7rem;color:var(--muted)">${s.label}</div>
    <div style="font-size:1.9rem;font-weight:800;color:${s.color};margin-top:.3rem">${s.val}</div>
  </div>`).join('');

  makeLineChart('ch-energy2', history.map(h=>h.time),[
    {label:'Solar W',data:history.map(h=>h.solar),borderColor:'#f0a020',backgroundColor:'rgba(240,160,32,.2)',fill:true,tension:.4,pointRadius:0},
    {label:'Battery %',data:history.map(h=>h.battery),borderColor:'#4ecdc4',backgroundColor:'rgba(78,205,196,.12)',fill:true,tension:.4,pointRadius:0},
  ]);
}

// NETWORK
let networkInit = false;
function renderNetwork() {
  if (networkInit) return;
  networkInit = true;
  const nodes = Array.from({length:10},(_,i)=>({
    id:i,
    x:15+(i%5)*18+(Math.random()*6-3),
    y:25+Math.floor(i/5)*38+(Math.random()*6-3),
    rssi:-40-Math.floor(Math.random()*40),
    online:Math.random()>0.15,
  }));
  const svg = document.getElementById('net-lines');
  svg.innerHTML = nodes.map(n=>`
    <line x1="${n.x}" y1="${n.y}" x2="50" y2="50"
      stroke="${n.online?'rgba(91,143,255,.45)':'rgba(231,76,60,.4)'}"
      stroke-width="0.25" stroke-dasharray="0.7 0.5">
      <animate attributeName="stroke-dashoffset" from="0" to="-2" dur="1s" repeatCount="indefinite"/>
    </line>`).join('');
  document.getElementById('net-nodes').innerHTML = nodes.map(n=>`
    <div class="node" style="left:${n.x}%;top:${n.y}%">
      <div class="node-dot" style="border:2px solid ${n.online?'rgba(91,143,255,.6)':'rgba(231,76,60,.6)'};background:rgba(255,255,255,.8)">
        ${n.online?'📶':'⚠️'}
      </div>
      <div class="node-lbl">N${n.id+1} · ${n.rssi}dBm</div>
    </div>`).join('');
}

// HEALTH
function renderHealth() {
  const { latest } = sensorData;
  if (!latest) return;
  const drowsiness = Math.min(100,Math.round((latest.co2-400)/8));
  const headache   = Math.min(100,Math.round(latest.aqi/2+(latest.temp-24)*2));
  const cognitive  = Math.max(0,100-drowsiness);
  const respiratory= Math.min(100,Math.round(latest.pm25*1.4));
  const comfort    = Math.max(0,100-Math.round((drowsiness+headache+respiratory)/4));
  const safeH      = Math.max(0.5,+(8-drowsiness/14).toFixed(1));

  document.getElementById('hlth-comfort').textContent = comfort;
  const lbl=document.getElementById('hlth-comfort-lbl');
  lbl.textContent = comfort>70?'Optimal environment':comfort>40?'Acceptable':'Suboptimal';

  document.getElementById('hlth-bars').innerHTML=[
    {label:'Drowsiness Risk',val:drowsiness,inverse:false},
    {label:'Headache Probability',val:headache,inverse:false},
    {label:'Cognitive Performance',val:cognitive,inverse:true},
    {label:'Respiratory Discomfort',val:respiratory,inverse:false},
  ].map(it=>`<div class="prog-wrap">
    <div class="prog-label">
      <span style="font-size:.82rem;color:var(--muted)">${it.label}</span>
      <span style="font-size:.82rem;font-weight:600;color:${it.inverse?'var(--accent)':it.val>60?'var(--danger)':it.val>30?'var(--warn)':'var(--accent)'}">${it.val}%</span>
    </div>
    <div class="prog"><div class="prog-fill" style="width:${it.val}%;background:${it.inverse?'linear-gradient(to right,var(--accent),var(--primary))':it.val>60?'var(--danger)':it.val>30?'var(--warn)':'var(--accent)'}"></div></div>
  </div>`).join('');

  document.getElementById('hlth-safe').textContent = safeH + ' h';
  document.getElementById('hlth-rec').textContent = comfort>70
    ? 'Maintain current ventilation. Conditions support focused work.'
    : 'Open windows or activate purifier — CO₂ buildup is reducing cognitive performance.';
  document.getElementById('hlth-vuln').textContent = respiratory>50
    ? 'Elevated risk for asthma & elderly. Consider relocation.'
    : 'No elevated risk for vulnerable groups.';
}

// ANALYTICS
let analyticsInit = false;
function renderAnalytics() {
  if (analyticsInit) return;
  analyticsInit = true;
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>({
    day:d,
    avgAQI:60+Math.round(Math.sin(i)*20+Math.random()*25),
    avgCO2:500+Math.round(Math.cos(i)*80+Math.random()*120),
  }));
  makeBarChart('ch-weekly',days.map(d=>d.day),[
    {label:'Avg AQI',data:days.map(d=>d.avgAQI),backgroundColor:'rgba(91,143,255,.7)',borderRadius:6},
    {label:'Avg CO₂/10',data:days.map(d=>Math.round(d.avgCO2/10)),backgroundColor:'rgba(78,205,196,.7)',borderRadius:6},
  ]);
}

function exportCsv() {
  const h = sensorData.history;
  const rows=[['time','co2','aqi','pm25','temp','humidity'],...h.map(r=>[r.time,r.co2,r.aqi,r.pm25,r.temp,r.humidity])];
  const csv=rows.map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='airpulse-data.csv';a.click();
}

// CHATBOT
let chatInit = false;
function renderChatbot() {
  if (chatInit) return;
  chatInit = true;
  const msgs=document.getElementById('chat-msgs');
  msgs.innerHTML='';
  addMsg('ai',"Hello! I'm AirPulse AI. I have live access to all 12 sensor nodes. Ask me about CO₂, AQI, safety, energy, or predictions.");
  const suggs=['What\'s the air quality?','Is the room safe?','Should I activate the purifier?','Forecast CO₂ for the next hour','Battery and solar status?'];
  document.getElementById('chat-suggs').innerHTML=suggs.map(s=>`<button class="sugg" onclick="chatSend('${s}')">${s}</button>`).join('');
}

function addMsg(role,text){
  const msgs=document.getElementById('chat-msgs');
  const d=document.createElement('div');
  d.className='msg '+role;
  d.textContent=text;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}

function chatSend(text){
  const inp=document.getElementById('chat-in');
  const t=text||inp.value.trim();
  if(!t)return;
  addMsg('user',t);
  inp.value='';
  setTimeout(()=>addMsg('ai',chatResponse(t)),400);
}

function chatResponse(input){
  const q=input.toLowerCase();
  const {latest,score:s}=sensorData;
  if(!latest) return "Connecting to sensors…";
  const r=riskLabel(s);
  if(q.includes('co2')||q.includes('co₂'))
    return `Current CO₂ is ${latest.co2} ppm. ${latest.co2>1000?'Above safe threshold — open windows or activate purifier.':'Within acceptable range.'}`;
  if(q.includes('aqi')||q.includes('air quality'))
    return `Live AQI: ${latest.aqi}. Status: ${r.label}. PM2.5 measured at ${latest.pm25} µg/m³.`;
  if(q.includes('safe')||q.includes('danger'))
    return `Environmental safety score: ${s}/100 — ${r.label}. ${s<50?'Recommend ventilation and purifier activation.':'No action required.'}`;
  if(q.includes('purif')||q.includes('fan'))
    return latest.aqi>80?'Purifier auto-engaged at high speed due to elevated AQI.':'Purifier currently in standby — air clean enough.';
  if(q.includes('temp'))
    return `Temperature is ${latest.temp}°C with ${latest.humidity}% humidity.`;
  if(q.includes('battery')||q.includes('energy')||q.includes('solar'))
    return `Battery: ${latest.battery}%, solar harvest: ${latest.solar} W. Expected 36h off-grid autonomy.`;
  if(q.includes('predict')||q.includes('forecast'))
    return 'LSTM forecast: CO₂ likely stable next 60 min. Confidence 91%. No hazard predicted.';
  return `I monitor 12 sensor nodes in real time. Current risk score: ${s}/100 (${r.label}). Ask about CO₂, AQI, purification, energy, or predictions.`;
}

// ── init ─────────────────────────────────────────────────────────────────────
fetch('/api/sensors').then(r=>r.json()).then(d=>{
  sensorData=d;
  refreshCurrentPage();
});
</script>
</body>
</html>"""

@app.route("/")
def index():
    return HTML

if __name__ == "__main__":
    port = 5000
    print("=" * 55)
    print("  AirPulse IoT — Starting server…")
    print(f"  Open in your browser: http://localhost:{port}")
    print("  Press Ctrl+C to stop.")
    print("=" * 55)
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
