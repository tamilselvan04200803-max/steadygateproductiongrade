import React from "react";

export interface GestureGuideItem {
  id: string;
  name: string;
  description: string;
  targetAppliance: string;
  hazardTier: "Tier 1 (Safe)" | "Tier 2 (Continuous)" | "Tier 3 (High Hazard)";
  colorClass: string;
  svgIcon: React.ReactNode;
}

export const GESTURE_CATALOG: GestureGuideItem[] = [
  {
    id: "OPEN_PALM",
    name: "Open Palm",
    description: "All 5 fingers extended, palm facing camera (Hold >= 350ms)",
    targetAppliance: "Living Room Lamp (Toggle ON)",
    hazardTier: "Tier 1 (Safe)",
    colorClass: "border-sky-500/50 bg-sky-950/20 text-sky-400",
    svgIcon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-4 0v4" />
        <path d="M14 10V4a2 2 0 0 0-4 0v6" />
        <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    ),
  },
  {
    id: "FIST",
    name: "Closed Fist",
    description: "All fingers flexed tightly against palm",
    targetAppliance: "Living Room Lamp (Toggle OFF) / Heater Chord Step 2",
    hazardTier: "Tier 1 (Safe)",
    colorClass: "border-slate-500/50 bg-slate-900/30 text-slate-300",
    svgIcon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="6" width="14" height="13" rx="4" />
        <path d="M5 10h14" />
        <path d="M5 14h14" />
        <path d="M10 6V4a2 2 0 0 1 4 0v2" />
      </svg>
    ),
  },
  {
    id: "THUMBS_UP",
    name: "Thumbs Up",
    description: "Thumb extended vertically upward, fingers curled",
    targetAppliance: "Standing Fan (Increment Speed / ON)",
    hazardTier: "Tier 1 (Safe)",
    colorClass: "border-emerald-500/50 bg-emerald-950/20 text-emerald-400",
    svgIcon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
      </svg>
    ),
  },
  {
    id: "THUMBS_DOWN",
    name: "Thumbs Down (0ms Emergency Disarm)",
    description: "Thumb extended vertically downward, fingers curled",
    targetAppliance: "Immediate Disarm / All Appliances OFF",
    hazardTier: "Tier 1 (Safe)",
    colorClass: "border-rose-500/50 bg-rose-950/20 text-rose-400",
    svgIcon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 14V2" />
        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
      </svg>
    ),
  },
  {
    id: "AIR_DIAL_PINCH",
    name: "Air-Dial Continuous Pinch",
    description: "Thumb tip contact with Index tip with 150ms Commit-on-Release lookback",
    targetAppliance: "Table Lamp Dimmer (0-100%) / Fan Speed (1-5)",
    hazardTier: "Tier 2 (Continuous)",
    colorClass: "border-amber-500/50 bg-amber-950/20 text-amber-400",
    svgIcon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m10 15 5-3-5-3v6Z" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    id: "HEATER_TWO_STEP_CHORD",
    name: "Tier 3 Safety Chord",
    description: "OPEN_PALM >= 350ms followed immediately by FIST held for 1500ms",
    targetAppliance: "9.1A Radiant Quartz Heater (1,800s HW cutoff timer)",
    hazardTier: "Tier 3 (High Hazard)",
    colorClass: "border-red-600/60 bg-red-950/30 text-red-400",
    svgIcon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      </svg>
    ),
  },
];

export function GestureVisualGuides() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SteadyGate Assistive Gesture Visual Guide
          </h3>
          <p className="text-xs text-slate-400">
            Pathological-tolerant biomechanical gestures with Mondrian conformal bounds.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 font-mono text-slate-300">
          6 Clinical Profiles Verified
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GESTURE_CATALOG.map((g) => (
          <div
            key={g.id}
            className={`p-3 rounded-lg border flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] ${g.colorClass}`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-black/40 shrink-0">{g.svgIcon}</div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight truncate">{g.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                  {g.description}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="font-medium text-slate-300 truncate max-w-[140px]">
                {g.targetAppliance}
              </span>
              <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-black/50 text-[9px]">
                {g.hazardTier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
