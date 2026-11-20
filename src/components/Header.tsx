"use client";

import React from "react";
import { UserProfile } from "@/lib/types";
import {
  ShieldCheck,
  Activity,
  Home,
  FileText,
  Sliders,
  Sparkles,
} from "lucide-react";

export type ActiveTab = "CONTROL" | "TRAINING" | "DIAGNOSTICS";

interface HeaderProps {
  profiles: UserProfile[];
  selectedProfile: UserProfile | null;
  onSelectProfile: (profile: UserProfile) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  filterEnabled: boolean;
  setFilterEnabled: (val: boolean) => void;
  onOpenEnrolment: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profiles,
  selectedProfile,
  onSelectProfile,
  activeTab,
  setActiveTab,
  filterEnabled,
  setFilterEnabled,
  onOpenEnrolment,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Brand Logo & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-100">
                    SteadyGate<span className="text-cyan-400 font-normal">™</span>
                  </h1>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    Unified Hub v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Tremor-Filtered Hand Gesture Smart-Home Controller & Connected Digital Twin
                </p>
              </div>
            </div>
          </div>

          {/* Three Focused Views Navigation */}
          <nav className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab("CONTROL")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "CONTROL"
                  ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Control</span>
            </button>

            <button
              onClick={() => setActiveTab("TRAINING")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "TRAINING"
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Training</span>
            </button>

            <button
              onClick={() => setActiveTab("DIAGNOSTICS")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === "DIAGNOSTICS"
                  ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Diagnostics</span>
            </button>
          </nav>

          {/* User Profile & 60s Enrolment Controls */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setFilterEnabled(!filterEnabled)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filterEnabled
                  ? "bg-emerald-950/60 border-emerald-700/70 text-emerald-300"
                  : "bg-rose-950/60 border-rose-700/70 text-rose-300"
              }`}
              title="Toggle Zero-Phase Tremor Band-Stop Filter"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  filterEnabled ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              <span>{filterEnabled ? "Filter: ON" : "Filter: OFF"}</span>
            </button>

            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                Profile:
              </span>
              <select
                aria-label="Select User Profile"
                value={selectedProfile?.id || ""}
                onChange={(e) => {
                  const found = profiles.find((p) => String(p.id) === e.target.value);
                  if (found) onSelectProfile(found);
                }}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name} ({Number(p.f0Hz || 5.0).toFixed(1)}Hz)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenEnrolment}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 transition-all"
              title="60-Second Personalized Tremor & Hand Enrolment"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>60s Enrol</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
