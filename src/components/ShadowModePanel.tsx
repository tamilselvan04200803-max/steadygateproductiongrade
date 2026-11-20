"use client";

/**
 * SteadyGate v6.0 — Shadow Mode Panel
 * ------------------------------------------------------------------
 * UI for monitoring shadow evaluation, promoting candidates,
 * and instant rollback. Three views: CONTROL, TRAINING, DIAGNOSTICS.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  Zap,
  Shield,
  History,
  Settings,
  ArrowUpRight,
  ArrowDownLeft,
  Database,
  GitBranch,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ShadowModeStatus, ShadowMetrics, ModelVersion, ShadowModeConfig, PromotionRecord } from "@/lib/shadow-mode";

interface ShadowModePanelProps {
  initialStatus?: ShadowModeStatus;
  onStatusChange?: (status: ShadowModeStatus) => void;
}

type ViewMode = "CONTROL" | "TRAINING" | "DIAGNOSTICS";

const STATUS_COLORS: Record<ShadowModeStatus, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  DISABLED: { bg: "bg-slate-900/50", text: "text-slate-400", border: "border-slate-700", icon: <Pause className="w-4 h-4" /> },
  EVALUATING: { bg: "bg-blue-900/30", text: "text-blue-300", border: "border-blue-500/50", icon: <Play className="w-4 h-4" /> },
  PROMOTION_READY: { bg: "bg-emerald-900/30", text: "text-emerald-300", border: "border-emerald-500/50", icon: <CheckCircle2 className="w-4 h-4" /> },
  PROMOTED: { bg: "bg-emerald-900/50", text: "text-emerald-400", border: "border-emerald-500", icon: <CheckCircle2 className="w-4 h-4" /> },
  REJECTED: { bg: "bg-red-900/30", text: "text-red-300", border: "border-red-500/50", icon: <AlertCircle className="w-4 h-4" /> },
};

const GESTURES = [
  "OPEN_PALM", "FIST", "VICTORY", "POINTING_UP", "THUMBS_UP",
  "THUMBS_DOWN", "PINCH", "CALL_ME", "THREE_FINGERS", "FOUR_FINGERS", "UNKNOWN"
] as const;

const GESTURE_ICONS: Record<string, string> = {
  OPEN_PALM: "✋", FIST: "✊", VICTORY: "✌️", POINTING_UP: "☝️", THUMBS_UP: "👍",
  THUMBS_DOWN: "👎", PINCH: "👌", CALL_ME: "🤙", THREE_FINGERS: "🤟", FOUR_FINGERS: "🖖", UNKNOWN: "❓",
};

export function ShadowModePanel({ initialStatus = "DISABLED", onStatusChange }: ShadowModePanelProps) {
  const [view, setView] = useState<ViewMode>("CONTROL");
  const [status, setStatus] = useState<ShadowModeStatus>(initialStatus);
  const [metrics, setMetrics] = useState<ShadowMetrics | null>(null);
  const [config, setConfig] = useState<ShadowModeConfig | null>(null);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [productionVersion, setProductionVersion] = useState<ModelVersion | null>(null);
  const [candidateVersion, setCandidateVersion] = useState<ModelVersion | null>(null);
  const [history, setHistory] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotionInProgress, setPromotionInProgress] = useState(false);
  const [showCreateCandidate, setShowCreateCandidate] = useState(false);
  const [candidateUpdates, setCandidateUpdates] = useState<{ confidenceBoost?: number; glareCompressionGain?: number }>({});

  // Fetch status and metrics
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/shadow-eval?action=status");
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
        setMetrics(data.metrics);
        setConfig(data.config);
        setModelVersions(data.modelVersions || []);
        setProductionVersion(data.productionVersion || null);
        setCandidateVersion(data.candidateVersion || null);
        onStatusChange?.(data.status);
      }
    } catch (err) {
      console.error("Failed to fetch shadow status:", err);
    }
  }, [onStatusChange]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/model-promote?action=history");
      const data = await res.json();
      if (data.ok) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchStatus();
      await fetchHistory();
    };
    init();
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchHistory]);

  const callApi = async (endpoint: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "API error");
      await fetchStatus();
      await fetchHistory();
      return data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = async () => {
    if (!candidateVersion) {
      setError("No candidate model registered. Create or register a candidate first.");
      return;
    }
    await callApi("/api/shadow-eval", { action: "evaluate_frame", landmarks: [] }); // Trigger evaluation
  };

  const handlePromote = async () => {
    setPromotionInProgress(true);
    try {
      await callApi("/api/model-promote", { action: "promote", promotedBy: "dashboard-admin" });
    } finally {
      setPromotionInProgress(false);
    }
  };

  const handleRollback = async () => {
    setPromotionInProgress(true);
    try {
      await callApi("/api/model-promote", { action: "rollback", rollbackReason: "Manual rollback from dashboard" });
    } finally {
      setPromotionInProgress(false);
    }
  };

  const handleCreateCandidate = async () => {
    await callApi("/api/shadow-eval", {
      action: "create_candidate_from_production",
      adminUpdates: candidateUpdates,
    });
    setShowCreateCandidate(false);
    setCandidateUpdates({});
  };

  const handleRegisterCandidate = async () => {
    // In a real implementation, this would load a model from storage
    // For now, create from production with empty updates
    await callApi("/api/shadow-eval", {
      action: "create_candidate_from_production",
      adminUpdates: {},
    });
  };

  const handleClearCandidate = async () => {
    await callApi("/api/shadow-eval", { action: "clear_candidate" });
  };

  const handleUpdateConfig = async (newConfig: Partial<ShadowModeConfig>) => {
    await callApi("/api/shadow-eval", { action: "update_config", config: newConfig });
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const statusInfo = STATUS_COLORS[status];

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header with View Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusInfo.bg} border ${statusInfo.border}`}>
            {statusInfo.icon}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Shadow Mode</h2>
            <p className="text-[11px] font-mono text-slate-400 capitalize">{status.toLowerCase().replace("_", " ")}</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1">
          {(["CONTROL", "TRAINING", "DIAGNOSTICS"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-medium transition-all ${
                view === v
                  ? "bg-slate-800 text-cyan-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* CONTROL VIEW */}
      {view === "CONTROL" && (
        <div className="p-4 space-y-4">
          {/* Status Card */}
          <div className={`p-4 rounded-xl border ${statusInfo.border} ${statusInfo.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100">Evaluation Status</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusInfo.text}`}>
                {status}
              </span>
            </div>

            {status === "DISABLED" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">No candidate model is being evaluated.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegisterCandidate}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 text-sm font-medium transition-colors"
                  >
                    <GitBranch className="w-4 h-4 inline mr-1" />
                    Create Candidate from Production
                  </button>
                  <button
                    onClick={() => setShowCreateCandidate(true)}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-sm font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4 inline mr-1" />
                    Custom Candidate
                  </button>
                </div>
              </div>
            )}

            {status === "EVALUATING" && metrics && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-slate-900/50 rounded-lg">
                    <p className="text-[10px] font-mono uppercase text-slate-400">Frames Evaluated</p>
                    <p className="font-mono text-lg text-cyan-300">{metrics.totalFrames.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-slate-900/50 rounded-lg">
                    <p className="text-[10px] font-mono uppercase text-slate-400">Agreement Rate</p>
                    <p className={`font-mono text-lg ${metrics.agreementRate >= 0.95 ? "text-emerald-300" : "text-amber-300"}`}>
                      {(metrics.agreementRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900/50 rounded-lg">
                    <p className="text-[10px] font-mono uppercase text-slate-400">FAR Delta</p>
                    <p className={`font-mono text-lg ${metrics.farDelta <= 0.001 ? "text-emerald-300" : "text-red-300"}`}>
                      {(metrics.farDelta * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900/50 rounded-lg">
                    <p className="text-[10px] font-mono uppercase text-slate-400">Latency Delta</p>
                    <p className={`font-mono text-lg ${metrics.latencyDeltaMs <= 5 ? "text-emerald-300" : "text-amber-300"}`}>
                      {metrics.latencyDeltaMs >= 0 ? "+" : ""}{metrics.latencyDeltaMs.toFixed(2)} ms
                    </p>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/50 rounded-lg">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Evaluation Duration</p>
                  <p className="font-mono text-lg text-slate-300">{formatDuration(metrics.evaluationDurationMs)}</p>
                </div>

                {metrics.blockingReasons.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-500/30">
                    <p className="text-[11px] font-medium text-amber-300 mb-1">Blocking Promotion:</p>
                    <ul className="text-[11px] text-slate-300 space-y-0.5">
                      {metrics.blockingReasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {metrics.promotionReady && (
                  <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/30">
                    <p className="text-[11px] font-medium text-emerald-300">✅ All criteria met — Ready for promotion</p>
                  </div>
                )}
              </div>
            )}

            {status === "PROMOTION_READY" && (
              <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-center">
                <p className="text-sm font-medium text-emerald-300 mb-2">Candidate Ready for Promotion</p>
                <button
                  onClick={handlePromote}
                  disabled={loading || promotionInProgress}
                  className="w-full py-2 px-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {promotionInProgress ? "Promoting..." : "🚀 Promote to Production"}
                </button>
              </div>
            )}

            {status === "PROMOTED" && (
              <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-center">
                <p className="text-sm font-medium text-emerald-300 mb-2">✅ Successfully Promoted</p>
                <button
                  onClick={handleRollback}
                  disabled={loading || promotionInProgress}
                  className="w-full py-2 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {promotionInProgress ? "Rolling back..." : "↩️ Rollback"}
                </button>
              </div>
            )}

            {candidateVersion && status !== "DISABLED" && (
              <div className="pt-3 border-t border-slate-700">
                <p className="text-[10px] font-mono uppercase text-slate-400 mb-1">Active Candidate</p>
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm text-purple-300">{candidateVersion.id}</p>
                    <p className="text-[10px] text-slate-400">v{candidateVersion.version} • {new Date(candidateVersion.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={handleClearCandidate}
                    disabled={loading}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    Clear Candidate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Order Verification */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Pipeline Order Invariant
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Stage 4 (Tremor Decoupling) → Stage 3B (Intentionality)</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>y_clean feeds conformal gate</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero actuator impact from candidate</span>
              </div>
            </div>
            {metrics && (
              <p className={`text-[11px] mt-2 ${metrics.blockingReasons.some(r => r.includes("Pipeline order")) ? "text-red-300" : "text-emerald-300"}`}>
                {metrics.blockingReasons.some(r => r.includes("Pipeline order")) ? "⚠️ Pipeline order violation detected!" : "✅ Pipeline order verified on all frames"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TRAINING VIEW */}
      {view === "TRAINING" && (
        <div className="p-4 space-y-4">
          {/* Production Model */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Production Model
            </h3>
            {productionVersion ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm text-cyan-300">{productionVersion.id}</p>
                    <p className="text-[10px] text-slate-400">v{productionVersion.version} • {productionVersion.modelState.totalSamplesTrained.toLocaleString()} samples</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-slate-900/50 rounded">
                    <p className="text-[10px] font-mono uppercase text-slate-400">Negative Signatures</p>
                    <p className="font-mono text-lg text-emerald-300">{productionVersion.modelState.negativeGraspSignatures.length}</p>
                  </div>
                  <div className="p-2 bg-slate-900/50 rounded">
                    <p className="text-[10px] font-mono uppercase text-slate-400">Error Reduction</p>
                    <p className="font-mono text-lg text-purple-300">{productionVersion.modelState.environmentalWeights.adaptedErrorReductionPct}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No production model loaded</p>
            )}
          </div>

          {/* Create Candidate Form */}
          {showCreateCandidate && (
            <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
              <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Create Custom Candidate
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Admin-trained prototype updates only. HaGRID prototype adaptation is OFF by default.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="text-[11px] text-slate-300">
                  <p className="font-mono mb-1">confidenceBoost (max 1.25)</p>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="1.25"
                    value={candidateUpdates.confidenceBoost || 1.04}
                    onChange={e => setCandidateUpdates({ ...candidateUpdates, confidenceBoost: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm font-mono"
                  />
                </label>
                <label className="text-[11px] text-slate-300">
                  <p className="font-mono mb-1">glareCompressionGain</p>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="1.5"
                    value={candidateUpdates.glareCompressionGain || 1.22}
                    onChange={e => setCandidateUpdates({ ...candidateUpdates, glareCompressionGain: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-sm font-mono"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCandidate}
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-sm font-medium"
                >
                  Create & Register Candidate
                </button>
                <button
                  onClick={() => setShowCreateCandidate(false)}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Model Versions List */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              Model Versions
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {modelVersions.map(v => (
                <div
                  key={v.id}
                  className={`p-2 rounded-lg border text-xs ${
                    v.isProduction
                      ? "bg-emerald-900/20 border-emerald-500/30"
                      : v.isCandidate
                      ? "bg-purple-900/20 border-purple-500/30"
                      : "bg-slate-900/50 border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {v.isProduction && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300">PROD</span>}
                      {v.isCandidate && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300">CANDIDATE</span>}
                      <span className="font-mono text-slate-300">{v.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">v{v.version} • {v.modelState.totalSamplesTrained.toLocaleString()} samples</span>
                  </div>
                  {v.promotionHistory && v.promotionHistory.length > 0 && (
                    <div className="mt-1 ml-6 text-[10px] text-slate-400">
                      {v.promotionHistory.map((h, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {h.rolledBack ? (
                            <RotateCcw className="w-3 h-3 text-red-400" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          )}
                          {h.promotedAt.split("T")[0]} — {h.promotedBy} {h.rolledBack ? `↩️ ${h.rollbackReason}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTICS VIEW */}
      {view === "DIAGNOSTICS" && (
        <div className="p-4 space-y-4">
          {/* Agreement Rate Chart */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Per-Gesture Agreement
            </h3>
            {metrics && (
              <div className="space-y-2">
                {GESTURES.map(g => {
                  const data = metrics.perGestureAgreement[g];
                  if (!data || data.total === 0) return null;
                  const rate = data.agreed / data.total;
                  return (
                    <div key={g} className="flex items-center gap-3">
                      <span className="w-6 text-center">{GESTURE_ICONS[g]}</span>
                      <span className="w-24 font-mono text-[11px] text-slate-300">{g}</span>
                      <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${rate * 100}%`,
                            background: rate >= 0.95 ? "#34d399" : rate >= 0.85 ? "#fbbf24" : "#f87171",
                          }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[11px] text-slate-400">
                        {(rate * 100).toFixed(1)}% ({data.agreed}/{data.total})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latency Comparison */}
          {metrics && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Latency Comparison
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Baseline Avg</p>
                  <p className="font-mono text-2xl text-cyan-300">{metrics.avgBaselineLatencyMs.toFixed(2)} ms</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Candidate Avg</p>
                  <p className="font-mono text-2xl text-purple-300">{metrics.avgCandidateLatencyMs.toFixed(2)} ms</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Delta</p>
                  <p className={`font-mono text-2xl ${metrics.latencyDeltaMs <= 0 ? "text-emerald-300" : metrics.latencyDeltaMs <= 5 ? "text-amber-300" : "text-red-300"}`}>
                    {metrics.latencyDeltaMs >= 0 ? "+" : ""}{metrics.latencyDeltaMs.toFixed(2)} ms
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FAR Comparison */}
          {metrics && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                False Activation Rate
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Baseline FAR</p>
                  <p className="font-mono text-2xl text-emerald-300">{(metrics.baselineFar * 100).toFixed(4)}%</p>
                  <p className="text-[10px] text-slate-400">{metrics.negativeSamplesEvaluated} negative samples</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Candidate FAR</p>
                  <p className="font-mono text-2xl text-purple-300">{(metrics.candidateFar * 100).toFixed(4)}%</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Delta</p>
                  <p className={`font-mono text-2xl ${metrics.farDelta <= 0 ? "text-emerald-300" : metrics.farDelta <= 0.001 ? "text-amber-300" : "text-red-300"}`}>
                    {metrics.farDelta >= 0 ? "+" : ""}{(metrics.farDelta * 100).toFixed(4)}%
                  </p>
                  <p className="text-[10px] text-slate-400">Max allowed: 0.100%</p>
                </div>
              </div>
            </div>
          )}

          {/* Promotion History */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Promotion History
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No promotion history yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] text-slate-300">{h.fromVersionId} → {h.toVersionId}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${
                        h.rolledBack ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {h.rolledBack ? "ROLLED BACK" : "PROMOTED"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span>{new Date(h.promotedAt).toLocaleString()}</span>
                      <span>by {h.promotedBy}</span>
                      <span>Agreement: {(h.metrics.agreementRate * 100).toFixed(1)}%</span>
                      <span>FAR Δ: {(h.metrics.farDelta * 100).toFixed(3)}%</span>
                      {h.rolledBack && <span className="text-red-300">Reason: {h.rollbackReason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}