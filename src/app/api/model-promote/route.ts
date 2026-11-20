/**
 * SteadyGate v6.0 — Model Promotion & Rollback API
 * ------------------------------------------------------------------
 * Atomic promotion of shadow candidate to production.
 * Instant 1-click rollback to previous version.
 * Preserves full promotion history for audit trail.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyApiRequest, verifyAdminRequestAuth } from "@/lib/security/api-guard";
import { getShadowModeEngine, ShadowModeEngine } from "@/lib/shadow-mode";
import { setAdminTrainedModel, getAdminTrainedModel } from "@/lib/hand-gesture-engine";
import type { AdminTrainedModelState } from "@/lib/hand-gesture-engine";

const shadowEngine = getShadowModeEngine();

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication for model promotion/rollback operations
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
      case "promote": {
        // Promote candidate to production
        const promotedBy = (body.promotedBy as string) || "admin";

        const result = shadowEngine.promote(promotedBy);

        if (!result.success) {
          return NextResponse.json(
            { ok: false, success: false, error: result.error },
            { status: 400 }
          );
        }

        // Verify the promotion took effect
        const newProduction = getAdminTrainedModel();

        return NextResponse.json({
          ok: true,
          success: true,
          versionId: result.versionId,
          newProductionVersion: newProduction.version,
          message: `Model promoted successfully to version ${newProduction.version}`,
          productionModel: newProduction,
        });
      }

      case "rollback": {
        // Instant 1-click rollback
        const rollbackReason = body.rollbackReason as string || "Manual rollback via API";

        const result = shadowEngine.rollback(rollbackReason);

        if (!result.success) {
          return NextResponse.json(
            { ok: false, success: false, error: result.error },
            { status: 400 }
          );
        }

        // Verify the rollback took effect
        const rolledBackModel = getAdminTrainedModel();

        return NextResponse.json({
          ok: true,
          success: true,
          versionId: result.versionId,
          rolledBackVersion: rolledBackModel.version,
          message: `Rolled back to version ${rolledBackModel.version}`,
          productionModel: rolledBackModel,
        });
      }

      case "get_history": {
        // Get promotion/rollback history
        const versions = shadowEngine.getModelVersions();

        const history = versions.flatMap(v =>
          (v.promotionHistory || []).map(h => ({
            ...h,
            fromVersion: v.id,
            toVersion: h.toVersionId,
          }))
        ).sort((a, b) => new Date(b.promotedAt).getTime() - new Date(a.promotedAt).getTime());

        return NextResponse.json({
          ok: true,
          success: true,
          history,
          currentProduction: shadowEngine.getProductionVersion(),
        });
      }

      case "list_versions": {
        // List all model versions with status
        const versions = shadowEngine.getModelVersions();

        return NextResponse.json({
          ok: true,
          success: true,
          versions,
          currentProductionId: shadowEngine.getProductionVersion()?.id,
        });
      }

      case "set_production": {
        // Force-set a specific version as production (admin override)
        const versionId = body.versionId as string;

        if (!versionId) {
          return NextResponse.json(
            { ok: false, success: false, error: "Missing versionId" },
            { status: 400 }
          );
        }

        const version = shadowEngine.getModelVersions().find(v => v.id === versionId);
        if (!version) {
          return NextResponse.json(
            { ok: false, success: false, error: `Version not found: ${versionId}` },
            { status: 404 }
          );
        }

        // Update global model
        setAdminTrainedModel(version.modelState);

        // Update shadow engine
        const oldProduction = shadowEngine.getProductionVersion();
        if (oldProduction) {
          oldProduction.isProduction = false;
        }
        version.isProduction = true;
        version.isCandidate = false;

        return NextResponse.json({
          ok: true,
          success: true,
          versionId: version.id,
          message: `Forced production to version ${version.version}`,
          productionModel: version.modelState,
        });
      }

      default:
        return NextResponse.json(
          { ok: false, success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Model promote API error:", err);
    return NextResponse.json(
      { ok: false, success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "history") {
      const versions = shadowEngine.getModelVersions();
      const history = versions.flatMap(v =>
        (v.promotionHistory || []).map(h => ({
          ...h,
          fromVersion: v.id,
          toVersion: h.toVersionId,
        }))
      ).sort((a, b) => new Date(b.promotedAt).getTime() - new Date(a.promotedAt).getTime());

      return NextResponse.json({
        ok: true,
        success: true,
        history,
        currentProduction: shadowEngine.getProductionVersion(),
      });
    }

    if (action === "versions") {
      return NextResponse.json({
        ok: true,
        success: true,
        versions: shadowEngine.getModelVersions(),
        currentProductionId: shadowEngine.getProductionVersion()?.id,
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      production: shadowEngine.getProductionVersion(),
      candidate: shadowEngine.getCandidateVersion(),
      status: shadowEngine.getStatus(),
    });
  } catch (err) {
    console.error("Model promote GET error:", err);
    return NextResponse.json(
      { ok: false, success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}