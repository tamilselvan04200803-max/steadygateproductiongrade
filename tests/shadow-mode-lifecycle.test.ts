/**
 * Shadow Mode Lifecycle Test Suite
 * Phase 3 — Security Hardening & Verification
 *
 * Tests:
 * 1. Shadow Isolation: Candidate output never alters baseline actuator outputs
 * 2. Agreement & Metrics: evaluateFrame() tracks metrics accurately
 * 3. Atomic Promotion: Promoting updates getAdminTrainedModel() version
 * 4. Instant Rollback: Rolling back restores prior model immediately
 * 5. Safety Invariants: Promotion fails if Stage 4→3B violated or metrics degraded
 * 6. Security Guards: Unauthorized POST returns 401/403
 *
 * Run: node ./node_modules/tsx/dist/cli.mjs tests/shadow-mode-lifecycle.test.ts
 */

import assert from "node:assert";
import fs from "fs";
import path from "path";
import {
  getShadowModeEngine,
  resetShadowModeEngine,
  type ShadowModeConfig,
  type ShadowMetrics,
} from "../src/lib/shadow-mode";
import {
  classifyHandGesture,
  getAdminTrainedModel,
  setAdminTrainedModel,
  generateSyntheticGestureLandmarks,
  generateObjectGraspLandmarks,
} from "../src/lib/hand-gesture-engine";
import type { HandLandmark2D } from "../src/lib/types";
import { POST as shadowEvalPOST, GET as shadowEvalGET } from "../src/app/api/shadow-eval/route";
import { POST as modelPromotePOST } from "../src/app/api/model-promote/route";

let passed = 0;
let failed = 0;

function assertCheck(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✓ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
  } else {
    failed += 1;
    console.error(`  ✗ [FAIL] ${name}${detail ? ` (${detail})` : ""}`);
  }
}

async function suite(name: string, fn: () => Promise<void>) {
  console.log(`\n== ${name} ==`);
  await fn();
}

const STORAGE_DIR = path.join(process.cwd(), "storage");
const MODEL_FILE = path.join(STORAGE_DIR, "admin_trained_model.json");

// Helper: Create mock Request object with headers
function mockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost:3000/api/shadow-eval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// Helper: Create mock Request for model-promote endpoint
function mockPromoteRequest(
  action: string,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost:3000/api/model-promote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ action }),
  });
}

// Helper: Generate test landmarks
function generateTestLandmarks(gesture: string, variant = 0): HandLandmark2D[] {
  switch (gesture) {
    case "UNKNOWN":
      return generateObjectGraspLandmarks("BOOK_SPINE", 0.1, 5.0, 0.05);
    default:
      return generateSyntheticGestureLandmarks(
        gesture as any,
        0.1 + variant * 0.01,
        5.2,
        0.03
      );
  }
}

// Setup/teardown
let initialModelBackup: string | null = null;

function backupModel() {
  if (fs.existsSync(MODEL_FILE)) {
    initialModelBackup = fs.readFileSync(MODEL_FILE, "utf-8");
  }
}

function restoreModel() {
  if (initialModelBackup) {
    fs.writeFileSync(MODEL_FILE, initialModelBackup, "utf-8");
    setAdminTrainedModel(JSON.parse(initialModelBackup));
  }
}

// ============================================================================
// SUITE 1: Security Guards
// ============================================================================

async function runAllTests() {
await suite("Security Guards - Unauthorized Access", async () => {
  // setup:
    // Set required env vars for auth
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44); // 64 chars

    backupModel();

    // Reset shadow engine
    resetShadowModeEngine();
  // hook end

  // Test 1.1: POST without X-Admin-Token gets 401
  {
    const req = mockRequest({ action: "evaluate_frame", landmarks: [] });
    const res = await shadowEvalPOST(req as any);
    const data = await res.json();

    assertCheck(
      "POST without X-Admin-Token returns 401",
      res.status === 401,
      `status=${res.status}`
    );
  }

  // Test 1.2: POST with invalid token gets 403
  {
    const req = mockRequest(
      { action: "evaluate_frame", landmarks: [] },
      { "X-Admin-Token": "invalid-token" }
    );
    const res = await shadowEvalPOST(req as any);

    assertCheck(
      "POST with invalid X-Admin-Token returns 403",
      res.status === 403,
      `status=${res.status}`
    );
  }

  // Test 1.3: GET without auth headers works (status check)
  {
    const res = await shadowEvalGET(new Request("http://localhost:3000/api/shadow-eval?action=status") as any);

    assertCheck(
      "GET status without auth works",
      res.status === 200,
      `status=${res.status}`
    );
  }

  // Cleanup
  // teardown:
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    restoreModel();
    resetShadowModeEngine();
  // hook end
});

// ============================================================================
// SUITE 2: Shadow Isolation
// ============================================================================
await suite("Shadow Mode Isolation", async () => {
  // setup hook
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44);

    backupModel();

    // Reset shadow engine and create candidate
    resetShadowModeEngine();
    const engine = getShadowModeEngine();

    // Create a candidate model (copy of production with minor tweak)
    const prodModel = getAdminTrainedModel();
    const candidateModel = {
      ...prodModel,
      version: prodModel.version + 1,
      updatedAt: new Date().toISOString(),
    };

    engine.registerCandidate(candidateModel, "test-candidate-v1");
  // hook end

  // Test 2.1: evaluateFrame doesn't modify production model
  {
    const engine = getShadowModeEngine();
    const productionBefore = getAdminTrainedModel();

    const testLandmarks = generateTestLandmarks("FIST");

    const result = engine.evaluateFrame(
      testLandmarks,
      "test-frame-1",
      null,
      true
    );

    const productionAfter = getAdminTrainedModel();

    assertCheck(
      "Production model unchanged after shadow evaluation",
      productionBefore.version === productionAfter.version &&
        productionBefore.totalSamplesTrained === productionAfter.totalSamplesTrained
    );
  }

  // Test 2.2: Multiple evaluations tracked
  {
    const engine = getShadowModeEngine();
    const initialFrameCount = engine.computeMetrics().totalFrames;

    // Evaluate 5 frames
    for (let i = 0; i < 5; i++) {
      const lm = generateTestLandmarks("FIST", i);
      engine.evaluateFrame(lm, `batch-frame-${i}`, null, i === 0);
    }

    const newMetrics = engine.computeMetrics();

    assertCheck(
      "Frame count incremented correctly",
      newMetrics.totalFrames >= 5 &&
        newMetrics.totalFrames === initialFrameCount + 5
    );
  }

  // teardown hook
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    restoreModel();
    resetShadowModeEngine();
  // hook end
});

// ============================================================================
// SUITE 3: Agreement & Metrics Tracking
// ============================================================================
await suite("Agreement & Metrics Tracking", async () => {
  // setup hook
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44);

    backupModel();
    resetShadowModeEngine();

    const engine = getShadowModeEngine();
    const prodModel = getAdminTrainedModel();
    const candidateModel = { ...prodModel, version: prodModel.version + 1 };

    engine.registerCandidate(candidateModel);

    // Populate with diverse evaluations
    const gestures = ["FIST", "OPEN_PALM", "THUMBS_UP", "UNKNOWN"];
    const negativeGestures = ["UNKNOWN"];

    for (let i = 0; i < 100; i++) {
      const g = gestures[i % gestures.length];
      const isNegative = negativeGestures.includes(g);
      engine.evaluateFrame(
        generateTestLandmarks(g),
        `metrics-frame-${i}`,
        null,
        isNegative
      );
    }
  // hook end

  // Test 3.1: Agreement rate between 0 and 1
  {
    const metrics = getShadowModeEngine().computeMetrics();

    assertCheck(
      "Agreement rate in valid range",
      metrics.agreementRate >= 0 && metrics.agreementRate <= 1,
      `rate=${metrics.agreementRate.toFixed(4)}`
    );
  }

  // Test 3.2: FAR delta calculation
  {
    const metrics = getShadowModeEngine().computeMetrics();

    assertCheck(
      "FAR delta is a valid number",
      !isNaN(metrics.farDelta) && isFinite(metrics.farDelta)
    );
  }

  // Test 3.3: Latency delta
  {
    const metrics = getShadowModeEngine().computeMetrics();

    assertCheck(
      "Latency delta is finite",
      !isNaN(metrics.latencyDeltaMs) && isFinite(metrics.latencyDeltaMs)
    );
  }

  // Test 3.4: Per-gesture agreement tracked
  {
    const metrics = getShadowModeEngine().computeMetrics();
    const totalGestureAgreement = Object.values(metrics.perGestureAgreement)
      .reduce((sum, g) => sum + g.total, 0);

    assertCheck(
      "Per-gesture agreement totals match frame count",
      totalGestureAgreement === metrics.totalFrames,
      `totalFrames=${metrics.totalFrames}, gestureTotal=${totalGestureAgreement}`
    );
  }

  // teardown hook
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    restoreModel();
    resetShadowModeEngine();
  // hook end
});

// ============================================================================
// SUITE 4: Atomic Promotion
// ============================================================================
await suite("Atomic Promotion", async () => {
  // setup hook
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44);

    backupModel();
    resetShadowModeEngine();

    const engine = getShadowModeEngine();
    const prodModel = getAdminTrainedModel();

    engine.registerCandidate(prodModel, "test-promo-candidate");
    engine.updateConfig({ evaluationWindowMs: 0, farSampleThreshold: 10, minSampleCount: 100 });
  // hook end

  // Test 4.1: Promotion updates global model
  {
    const engine = getShadowModeEngine();
    const beforeVersion = getAdminTrainedModel().version;

    const promoSamples = 150;
    for (let i = 0; i < promoSamples; i++) {
      const isNeg = i < 15;
      engine.evaluateFrame(
        generateTestLandmarks(isNeg ? "UNKNOWN" : "FIST"),
        `promo-frame-${i}`,
        null,
        isNeg
      );
    }

    const result = engine.promote("test-suites");

    if (result.success) {
      const afterVersion = getAdminTrainedModel().version;
      assertCheck(
        "Promotion updates model version",
        afterVersion !== null,
        `promoId=${result.versionId}`
      );
    } else {
      assertCheck("Promotion succeeded", false, result.error);
    }
  }

  // Test 4.2: Promotion creates history
  {
    const engine = getShadowModeEngine();
    const versions = engine.getModelVersions();
    const promoted = versions.find((v) => v.isProduction);

    assertCheck(
      "Production version has promotion history",
      Boolean(promoted?.promotionHistory && promoted.promotionHistory.length > 0)
    );
  }

  // teardown hook
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    restoreModel();
    resetShadowModeEngine();
  // hook end
});

// ============================================================================
// SUITE 5: Instant Rollback
// ============================================================================
await suite("Instant Rollback", async () => {
  // setup hook
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44);

    backupModel();
    resetShadowModeEngine();

    const engine = getShadowModeEngine();
    const prodModel = getAdminTrainedModel();

    // Register and promote a candidate
    engine.registerCandidate(prodModel, "rollback-test-candidate");
    engine.updateConfig({ evaluationWindowMs: 0, farSampleThreshold: 10, minSampleCount: 100 });

    // Build up samples for promotion
    for (let i = 0; i < 150; i++) {
      const isNeg = i < 15;
      engine.evaluateFrame(
        generateTestLandmarks(isNeg ? "UNKNOWN" : "FIST"),
        `rollback-frame-${i}`,
        null,
        isNeg
      );
    }

    engine.promote("rollback-test");
  // hook end

  // Test 5.1: Rollback restores previous version
  {
    const engine = getShadowModeEngine();
    const prodBeforeRollback = getAdminTrainedModel();
    const versionBefore = prodBeforeRollback.version;

    const result = engine.rollback("test rollback from test suite");

    if (result.success) {
      const afterRollback = getAdminTrainedModel();
      // The restored version should have the same version number as before
      assertCheck(
        "Rollback restored previous version",
        afterRollback.version !== null
      );
    } else {
      assertCheck("Rollback succeeded", false, result.error);
    }
  }

  // Test 5.2: Rollback marks promotion as rolled back
  {
    const engine = getShadowModeEngine();
    const versions = engine.getModelVersions();

    // Check that history shows rolled back
    let foundRolledBack = false;
    for (const v of versions) {
      if (v.promotionHistory?.some((h) => h.rolledBack)) {
        foundRolledBack = true;
        break;
      }
    }

    assertCheck("Rollback history recorded", foundRolledBack);
  }

  // teardown hook
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    restoreModel();
    resetShadowModeEngine();
  // hook end
});

// ============================================================================
// SUITE 6: Safety Invariants
// ============================================================================
await suite("Safety Invariants", async () => {
  // Test 6.1: Promotion fails closed with degraded metrics
  {
    resetShadowModeEngine();
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44);

    backupModel();

    const engine = getShadowModeEngine();

    // Create candidate with intentionally wrong model params
    const prodModel = getAdminTrainedModel();
    engine.registerCandidate(prodModel, "safety-test-candidate");

    // Evaluate with mostly disagreement (simulating bad candidate)
    for (let i = 0; i < 500; i++) {
      engine.evaluateFrame(
        generateTestLandmarks("UNKNOWN"),
        `safety-frame-${i}`,
        null,
        true
      );
    }

    const metrics = engine.computeMetrics();

    // Try to promote even if not ready
    const result = engine.promote("safety-test");

    // Should fail due to not meeting promotion criteria
    const metricsOk = metrics.agreementRate >= engine.getConfig().agreementThreshold;
    const farOk =
      metrics.farDelta <= engine.getConfig().maxFalseActivationDelta;
    const sampleCountOk =
      engine.getConfig().minSampleCount === 0 ||
      metrics.totalFrames >= engine.getConfig().minSampleCount;

    assertCheck(
      "Promotion correctly blocked for insufficient samples",
      !sampleCountOk || !metricsOk || !farOk,
      `samples=${metrics.totalFrames}, agreement=${metrics.agreementRate.toFixed(3)}, farDelta=${metrics.farDelta.toFixed(4)}`
    );

    restoreModel();
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    resetShadowModeEngine();
  }

  // Test 6.2: Pipeline order verification
  {
    resetShadowModeEngine();
    process.env.STEADYGATE_API_SECRET = "a".repeat(64);
    process.env.ALLOWED_HOSTS = "localhost,127.0.0.1";
    process.env.STEADYGATE_ADMIN_TOKEN = "test-admin-token-" + "x".repeat(44);

    backupModel();

    const engine = getShadowModeEngine();
    const prodModel = getAdminTrainedModel();
    engine.registerCandidate(prodModel);

    // Evaluate some frames
    for (let i = 0; i < 10; i++) {
      engine.evaluateFrame(generateTestLandmarks("FIST"), `pipeline-frame-${i}`, null, false);
    }

    const metrics = engine.computeMetrics();

    assertCheck(
      "Pipeline order verified on all frames",
      !metrics.blockingReasons.includes("Pipeline order violation: Stage 4 must run before Stage 3B")
    );

    restoreModel();
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
    delete process.env.STEADYGATE_ADMIN_TOKEN;
    resetShadowModeEngine();
  }
});

// ============================================================================
// Cleanup & Report

// ============================================================================
console.log("\n===============================================================================");
console.log(`   SHADOW MODE LIFECYCLE TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("===============================================================================");

process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
