"use client";

import React from "react";
import {
  ShieldCheck,
  Activity,
  Home,
  FileText,
  Sliders,
  Sparkles,
  Eye,
  Sun,
  CheckCircle2,
  AlertTriangle,
  Power,
  RotateCcw,
  Database,
  Layers,
  Upload,
  Video,
  BookOpen,
  Hand,
  Lock,
  CheckCircle,
  Zap,
  HelpCircle,
  Flame,
  Droplets,
  Blinds,
  Tv,
  Wind,
  Lamp,
  Gauge,
  Thermometer,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Maximize2,
  Minimize2,
  Wand2,
  Cpu,
  Camera,
  Bell,
  Fan,
  RotateCcw as RotateCcwIcon,
  Save,
  Clock,
  X,
  UserPlus,
  Sliders as SlidersIcon,
  BookOpen as BookOpenIcon,
  Sun as SunIcon,
  Activity as ActivityIcon,
} from "lucide-react";

/**
 * SteadyGate Design System Component Library
 * Demonstrates the clinical design system tokens and primitives
 */
export const DesignSystemDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-12 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">SteadyGate Design System</h1>
              <p className="text-slate-400 text-sm mt-1">Clinical assistive technology UI — v6.0</p>
            </div>
          </div>
          <p className="text-slate-500 max-w-2xl text-sm">
            A distinctive visual identity for motor-disorder assistive technology.
            Every color, spacing, and interaction encodes clinical meaning — not decoration.
          </p>
        </div>
      </header>

      {/* Color Palette */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Color Palette — Semantic, Not Decorative
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Signal: Steady", bg: "bg-cyan-900/30", text: "text-cyan-400", border: "border-cyan-500/40", desc: "Tremor-filtered, locked, ready" },
            { name: "Signal: Attention", bg: "bg-amber-900/30", text: "text-amber-400", border: "border-amber-500/40", desc: "Attention needed (not error)" },
            { name: "Signal: Confirm", bg: "bg-emerald-900/30", text: "text-emerald-400", border: "border-emerald-500/40", desc: "Intent confirmed, actuation ready" },
            { name: "Signal: Hazard", bg: "bg-rose-900/30", text: "text-rose-400", border: "border-rose-500/40", desc: "Tier 3 thermal ONLY" },
          ].map((c, i) => (
            <div key={i} className={`p-6 rounded-xl border ${c.bg} ${c.border} ${c.text}`}>
              <div className="font-bold text-sm mb-1">{c.name}</div>
              <div className="text-xs opacity-80">{c.desc}</div>
              <div className="mt-4 flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-1 bg-slate-900 rounded">var(--sg-signal-steady)</span>
                <span className="text-slate-500">#06b6d4</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Base Surfaces */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Base Surfaces — Low Luminance Clinical
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { name: "Deep", color: "#020617", desc: "Primary background", token: "--sg-bg-deep" },
            { name: "Panel", color: "#0f172a", desc: "Card/panel background", token: "--sg-bg-panel" },
            { name: "Elevated", color: "#1e293b", desc: "Modal/elevated", token: "--sg-bg-elevated" },
            { name: "Border", color: "#334155", desc: "Subtle borders", token: "--sg-border" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-6" style={{ backgroundColor: s.color, border: "1px solid #475569" }}>
              <div className="w-full h-16 rounded-lg bg-slate-950/50 mb-3" />
              <div className="font-bold text-sm">{s.name}</div>
              <div className="text-xs text-slate-400">{s.desc}</div>
              <div className="mt-2 font-mono text-xs text-slate-500">{s.token}</div>
              <div className="mt-1 font-mono text-xs text-slate-500">{s.color}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Signal Badges — Semantic State Indicators
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase bg-cyan-900/30 text-cyan-400 border border-cyan-500/40">
            STEADY
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase bg-amber-900/30 text-amber-400 border border-amber-500/40">
            ATTENTION
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase bg-emerald-900/30 text-emerald-400 border border-emerald-500/40">
            CONFIRMED
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold font-mono uppercase bg-rose-900/30 text-rose-400 border border-rose-500/40">
            HAZARD
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">R0</span>
          <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-blue-900/30 text-blue-400 border border-blue-500/30">R1</span>
          <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-rose-900/30 text-rose-400 border border-rose-500/30">R2</span>
        </div>
      </section>

      {/* Buttons */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Power className="w-5 h-5 text-cyan-400" />
          Buttons — Clear Hierarchy
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <button className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold font-mono text-sm shadow-sm hover:bg-cyan-400 transition-colors">
            Primary — Steady
          </button>
          <button className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold font-mono text-sm hover:bg-emerald-400 transition-colors">
            Confirm — Actuate
          </button>
          <button className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold font-mono text-sm hover:bg-rose-400 transition-colors">
            Hazard — Tier 3 Only
          </button>
          <button className="px-4 py-2 rounded-lg bg-transparent text-slate-300 font-bold font-mono text-sm border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors">
            Ghost — Secondary
          </button>
        </div>
      </section>

      {/* Metrics */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-400" />
          KPI Metrics — Clinical Data Display
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "TREMOR ATTENUATION", value: "81.3%", unit: "%", sub: "≥72% invariant met", color: "text-emerald-400" },
            { label: "VOLUNTARY DELAY", value: "21", unit: "ms", sub: "≤30ms spec", color: "text-cyan-400" },
            { label: "FALSE ACTIVATIONS", value: "0", unit: "/62.5h", sub: "Rule of 3: ≤0.048/hr", color: "text-emerald-400" },
            { label: "INTENT SUCCESS", value: "100%", unit: "", sub: "5/5 profiles", color: "text-cyan-400" },
          ].map((m, i) => (
            <div key={i} className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">{m.label}</div>
              <div className="text-3xl font-bold font-mono {m.color}">{m.value}</div>
              <div className="text-xs text-slate-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Progress Ring */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Dwell Progress Ring — Intent Visualization
        </h2>
        <div className="flex items-center justify-center gap-12">
          {[
            { pct: 25, color: "stroke-amber-500", label: "R2 Heater (2.5s hold)" },
            { pct: 60, color: "stroke-blue-500", label: "R1 AC (1.2s hold)" },
            { pct: 100, color: "stroke-emerald-500", label: "R0 Fan (0.35s hold) — COMMITTED" },
          ].map((r, i) => (
            <div key={i} className="text-center">
              <svg width="100" height="100" className="sg-progress-ring">
                <circle className="sg-progress-ring-bg" cx="50" cy="50" r="45" />
                <circle
                  className={`sg-progress-ring-fill ${r.color}`}
                  cx="50"
                  cy="50"
                  r="45"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * r.pct) / 100}
                />
              </svg>
              <div className="mt-3 text-xs font-mono text-slate-400">{r.label}</div>
              <div className="text-2xl font-bold font-mono text-cyan-400">{r.pct}%</div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Table */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          Data Table — Clinical Audit Log
        </h2>
        <div className="overflow-x-auto rounded-xl bg-slate-900 border border-slate-800">
          <table className="w-full text-left text-[11px] font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase">
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">APPLIANCE</th>
                <th className="py-3 px-4">USER</th>
                <th className="py-3 px-4">COMMAND</th>
                <th className="py-3 px-4">DECISION</th>
                <th className="py-3 px-4">REASON</th>
                <th className="py-3 px-4">INTENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {[
                { time: "14:23:12", app: "Space Heater", user: "PD Patient", cmd: "SET_ON", decision: "ACTUATED", reason: "—", intent: "94%" },
                { time: "14:22:45", app: "Study Fan", user: "PD Patient", cmd: "SET_ON", decision: "ACTUATED", reason: "—", intent: "98%" },
                { time: "14:21:30", app: "Water Geyser", user: "PD Patient", cmd: "SET_ON", decision: "REJECTED", reason: "LOW_ATTENTION", intent: "42%" },
                { time: "14:20:15", app: "Living Room AC", user: "PD Patient", cmd: "SET_OFF", decision: "ACTUATED", reason: "—", intent: "91%" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-400">{row.time}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">{row.app}</td>
                  <td className="py-3 px-4 text-slate-300">{row.user}</td>
                  <td className="py-3 px-4 text-cyan-300 font-mono">{row.cmd}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      row.decision === "ACTUATED"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {row.decision === "ACTUATED" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {row.decision}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{row.reason}</td>
                  <td className="py-3 px-4 font-mono text-slate-200">{row.intent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Form Controls */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <SlidersIcon className="w-5 h-5 text-cyan-400" />
          Form Controls — Accessible Inputs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Text Input</label>
            <input
              type="text"
              placeholder="Enter patient identifier..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Select Profile</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono appearance-none">
              <option value="pd_rest">Parkinson&apos;s Rest Tremor (4-6 Hz)</option>
              <option value="et_kinetic">Essential Tremor (5-10 Hz)</option>
              <option value="lid_chorea">Levodopa Dyskinesia (1-3 Hz)</option>
              <option value="head_titubation">Head Titubation (5 Hz)</option>
              <option value="arthritic">Arthritic Contracture</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Tremor Injection Amplitude</span>
              <span className="font-mono text-cyan-400">0.045</span>
            </label>
            <input
              type="range"
              min="0.005"
              max="0.09"
              step="0.005"
              value="0.045"
              className="w-full h-1 bg-slate-700 rounded appearance-none accent-cyan-500 cursor-pointer"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <input type="checkbox" className="w-4 h-4 accent-cyan-500 rounded border-slate-700 bg-slate-900" />
              <span>Enable tremor band-stop filter</span>
            </label>
          </div>
        </div>
      </section>

      {/* Toggle Switch */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Toggle Switch — Filter State
        </h2>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative w-11 h-6 bg-slate-600 rounded-full border border-slate-500">
              <input type="checkbox" className="absolute opacity-0 w-0 h-0" defaultChecked />
              <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150" style={{ transform: "translateX(20px)" }} />
            </div>
            <span className="text-sm font-medium text-slate-200">Filter: ON (Steady)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative w-11 h-6 bg-slate-600 rounded-full border border-slate-500">
              <input type="checkbox" className="absolute opacity-0 w-0 h-0" />
              <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150" />
            </div>
            <span className="text-sm font-medium text-slate-200">Filter: OFF (Raw)</span>
          </label>
        </div>
      </section>

      {/* Tremor Spectrum Colors */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Tremor Spectrum Visualization Colors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { name: "Notch Filter", color: "#a855f7", desc: "Personalized f₀ ±1Hz band", token: "--sg-tremor-notch" },
            { name: "Dominant Peak", color: "#ec4899", desc: "f₀ tremor frequency peak", token: "--sg-tremor-peak" },
            { name: "Harmonic", color: "#38bdf8", desc: "2f₀, 3f₀ harmonic content", token: "--sg-tremor-harmonic" },
            { name: "Noise/Broadband", color: "#94a3b8", desc: "Non-physiological >12Hz", token: "--sg-tremor-noise" },
          ].map((t, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-full h-12 rounded-lg mb-2" style={{ backgroundColor: t.color }} />
              <div className="font-bold text-sm">{t.name}</div>
              <div className="text-xs text-slate-400">{t.desc}</div>
              <div className="mt-2 font-mono text-xs text-slate-500">{t.token}</div>
              <div className="font-mono text-xs text-slate-500">{t.color}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Status Dots */}
      <section className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Status Indicators — Live State
        </h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" />
            <span className="text-sm text-slate-300">Steady — Tremor locked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <span className="text-sm text-slate-300">Attention — Gaze needed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-sm text-slate-300">Confirmed — Ready to actuate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <span className="text-sm text-slate-300">Hazard — Tier 3 thermal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-sm text-slate-300">Idle — No hand detected</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto border-t border-slate-800 pt-8 pb-4 text-center text-sm text-slate-500">
        <p>SteadyGate v6.0 Design System — Clinical assistive technology visual identity</p>
        <p className="mt-1 font-mono text-xs">Semantic colors · Monospace data · Accessible by default · Reduced-motion respectful</p>
      </footer>
    </div>
  );
};

export default DesignSystemDemo;