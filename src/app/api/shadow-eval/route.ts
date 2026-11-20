/**
 * SteadyGate v6.0 — Shadow Evaluation API
 * ------------------------------------------------------------------
 * Evaluates frames with both baseline and candidate models in shadow mode.
 * Never passes candidate output to actuator.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyApiRequest, verifyAdminRequestAuth } from "@/lib/security/api-guard";
import { getShadowModeEngine, ShadowModeEngine } from "@/lib/shadow-mode";
import { classifyHandGesture } from "@/lib/hand-gesture-engine";
import type { HandLandmark2D, RecognizedGesture } from "@/lib/types";
import type { AdminTrainedModelState } from "@/lib/hand-gesture-engine";

const shadowEngine = getShadowModeEngine();

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication for candidate registration and evaluation
    const adminAuth = verifyAdminRequestAuth(req, { requireToken: true });
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { ok: false, success: false, error: adminAuth.error || "Unauthorized" },
        { status: adminAuth.status }
      );
    }

    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case "evaluate_frame": {
        // Evaluate a single frame with both baseline and candidate
        const landmarks = body.landmarks as HandLandmark2D[];
        const frameId = body.frameId as string || `frm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const userProfile = body.userProfile || null;
        const isNegativeSample = body.isNegativeSample === true;

        if (!landmarks || landmarks.length !== 21) {
          return NextResponse.json(
            { ok: false, success: false, error: "Invalid landmarks: expected 21 points" },
            { status: 400 }
          );
        }

        const result = shadowEngine.evaluateFrame(landmarks, frameId, userProfile, isNegativeSample);
        const metrics = shadowEngine.computeMetrics();

        return NextResponse.json({
          ok: true,
          success: true,
          frameResult: result,
          aggregatedMetrics: metrics,
        });
      }

      case "evaluate_batch": {
        // Evaluate multiple frames (for bulk testing)
        const frames = body.frames as Array<{
          landmarks: HandLandmark2D[];
          frameId?: string;
          userProfile?: unknown;
          isNegativeSample?: boolean;
        }>;

        if (!frames || !Array.isArray(frames)) {
          return NextResponse.json(
            { ok: false, success: false, error: "Invalid frames array" },
            { status: 400 }
          );
        }

        const results = frames.map(f =>
          shadowEngine.evaluateFrame(
            f.landmarks,
            f.frameId || `frm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            f.userProfile,
            f.isNegativeSample
          )
        );

        const metrics = shadowEngine.computeMetrics();

        return NextResponse.json({
          ok: true,
          success: true,
          frameResults: results,
          aggregatedMetrics: metrics,
        });
      }

      case "register_candidate": {
        // Register a new candidate model for shadow evaluation
        const candidateModel = body.candidateModel as AdminTrainedModelState;
        const candidateId = body.candidateId as string | undefined;

        if (!candidateModel) {
          return NextResponse.json(
            { ok: false, success: false, error: "Missing candidateModel" },
            { status: 400 }
          );
        }

        const id = shadowEngine.registerCandidate(candidateModel, candidateId);

        return NextResponse.json({
          ok: true,
          success: true,
          candidateId: id,
          status: shadowEngine.getStatus(),
        });
      }

      case "create_candidate_from_production": {
        // Create candidate from production with admin updates
        const adminUpdates = body.adminUpdates as Partial<AdminTrainedModelState> || {};

        try {
          const candidateModel = shadowEngine.createCandidateFromProduction(adminUpdates);
          const id = shadowEngine.registerCandidate(candidateModel);

          return NextResponse.json({
            ok: true,
            success: true,
            candidateModel,
            candidateId: id,
            status: shadowEngine.getStatus(),
          });
        } catch (err) {
          return NextResponse.json(
            { ok: false, success: false, error: (err as Error).message },
            { status: 500 }
          );
        }
      }

      case "clear_candidate": {
        shadowEngine.clearCandidate();
        return NextResponse.json({
          ok: true,
          success: true,
          status: shadowEngine.getStatus(),
        });
      }

      case "get_status": {
        return NextResponse.json({
          ok: true,
          success: true,
          status: shadowEngine.getStatus(),
          config: shadowEngine.getConfig(),
          metrics: shadowEngine.computeMetrics(),
          modelVersions: shadowEngine.getModelVersions(),
          productionVersion: shadowEngine.getProductionVersion(),
          candidateVersion: shadowEngine.getCandidateVersion(),
        });
      }

      case "update_config": {
        const config = body.config as Partial<{
          agreementThreshold: number;
          maxFalseActivationDelta: number;
          evaluationWindowMs: number;
          minSampleCount: number;
          farSampleThreshold: number;
        }>;
        shadowEngine.updateConfig(config);
        return NextResponse.json({
          ok: true,
          success: true,
          config: shadowEngine.getConfig(),
        });
      }

      default:
        return NextResponse.json(
          { ok: false, success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Shadow eval API error:", err);
    return NextResponse.json(
      { ok: false, success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Allow unauthenticated GET for status checks
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "status") {
      return NextResponse.json({
        ok: true,
        success: true,
        status: shadowEngine.getStatus(),
        config: shadowEngine.getConfig(),
        metrics: shadowEngine.computeMetrics(),
        modelVersions: shadowEngine.getModelVersions(),
        productionVersion: shadowEngine.getProductionVersion(),
        candidateVersion: shadowEngine.getCandidateVersion(),
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      status: shadowEngine.getStatus(),
      config: shadowEngine.getConfig(),
      metrics: shadowEngine.computeMetrics(),
    });
  } catch (err) {
    console.error("Shadow eval GET error:", err);
    return NextResponse.json(
      { ok: false, success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}