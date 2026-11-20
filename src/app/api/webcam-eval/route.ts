/**
 * SteadyGate v6.0 — Guided Real-Webcam & Model Triad Evaluation API
 * ------------------------------------------------------------------
 * Endpoint for:
 * 1. Running Triad Evaluation (B0 Baseline vs B1 Enrolled vs B2 Admin) on held-out inputs.
 * 2. Recording opt-in labeled landmark sequences (zero raw video stored).
 * 3. Persistent session recording for ENROLMENT and INDEPENDENT_EVAL sessions.
 * 4. Fetching latest comparative evaluation reports.
 *
 * Safety: Candidate models remain strictly isolated from actuation.
 * Privacy: Only 21 normalized landmarks & biomechanics stored, never video frames.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  RealWebcamEvaluator,
  RealWebcamEvaluationReport,
  EvaluationSample,
  DisjointEvaluationInput,
} from "@/lib/real-webcam-evaluator";
import { TemporalEvaluator, runFullTemporalEvaluation, TemporalEvaluationReport } from "@/lib/temporal-evaluator";
import { HandLandmark2D, RecognizedGesture } from "@/lib/types";
import {
  WebcamRecordedSession,
  WebcamRecordedTrial,
  WebcamRecordedFrame,
  SessionSummary,
  SessionType,
} from "@/lib/webcam-session-types";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const REPORTS_DIR = path.join(process.cwd(), "docs", "reports");
const RECORDED_SAMPLES_PATH = path.join(STORAGE_DIR, "webcam_eval_recorded_samples.json");
const REPORT_PATH = path.join(REPORTS_DIR, "REAL_WEBCAM_EVALUATION_REPORT.json");
const TEMPORAL_REPORT_PATH = path.join(REPORTS_DIR, "TEMPORAL_EVALUATION_REPORT.json");
const RECORDED_SESSIONS_DIR = path.join(STORAGE_DIR, "recorded_sessions");

function ensureDirs() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (!fs.existsSync(RECORDED_SESSIONS_DIR)) fs.mkdirSync(RECORDED_SESSIONS_DIR, { recursive: true });
}

function ensureRecordedSessionsDir() {
  if (!fs.existsSync(RECORDED_SESSIONS_DIR)) fs.mkdirSync(RECORDED_SESSIONS_DIR, { recursive: true });
}

function loadRecordedSamples(): EvaluationSample[] {
  ensureDirs();
  if (fs.existsSync(RECORDED_SAMPLES_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(RECORDED_SAMPLES_PATH, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveRecordedSamples(samples: EvaluationSample[]) {
  ensureDirs();
  fs.writeFileSync(RECORDED_SAMPLES_PATH, JSON.stringify(samples, null, 2));
}

function loadLatestReport(): RealWebcamEvaluationReport | null {
  ensureDirs();
  if (fs.existsSync(REPORT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(REPORT_PATH, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function loadTemporalReport(): TemporalEvaluationReport | null {
  ensureDirs();
  if (fs.existsSync(TEMPORAL_REPORT_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(TEMPORAL_REPORT_PATH, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "latest";
    const temporal = searchParams.get("temporal") === "true";

    if (action === "recorded_samples") {
      const samples = loadRecordedSamples();
      return NextResponse.json({
        ok: true,
        success: true,
        count: samples.length,
        samples: samples.slice(-50), // Return latest 50
      });
    }

    if (action === "list_sessions") {
      ensureRecordedSessionsDir();
      const files = fs.readdirSync(RECORDED_SESSIONS_DIR).filter(f => f.endsWith(".json"));
      const sessions: SessionSummary[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(RECORDED_SESSIONS_DIR, file);
          const sessionData = JSON.parse(fs.readFileSync(filePath, "utf-8")) as WebcamRecordedSession;

          let totalFrames = 0;
          let commandTrials = 0;
          let negativeTrials = 0;
          const gesturesCovered = new Set<RecognizedGesture | "NONE">();

          for (const trial of sessionData.trials) {
            totalFrames += trial.frames.length;
            if (trial.targetGesture === "NONE") {
              negativeTrials++;
            } else {
              commandTrials++;
            }
            gesturesCovered.add(trial.targetGesture);
          }

          sessions.push({
            sessionId: sessionData.sessionId,
            participantId: sessionData.participantId,
            sessionType: sessionData.sessionType,
            recordedAt: sessionData.recordedAt,
            trialCount: sessionData.trials.length,
            totalFrames,
            commandTrials,
            negativeTrials,
            gesturesCovered: Array.from(gesturesCovered),
          });
        } catch (e) {
          console.error(`Failed to parse session file ${file}:`, e);
        }
      }

      // Sort by recordedAt descending (newest first)
      sessions.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

      return NextResponse.json({
        ok: true,
        success: true,
        sessions,
      });
    }

    // Handle temporal evaluation report request
    if (temporal) {
      let temporalReport = loadTemporalReport();
      if (!temporalReport) {
        // Auto-generate temporal report if none exists
        const participantId = searchParams.get("participantId") || "P01-Parkinsons";
        temporalReport = await runFullTemporalEvaluation(participantId);
        fs.writeFileSync(TEMPORAL_REPORT_PATH, JSON.stringify(temporalReport, null, 2));
      }

      return NextResponse.json({
        ok: true,
        success: true,
        report: temporalReport,
      });
    }

    // Default: return latest evaluation report
    let report = loadLatestReport();
    if (!report) {
      // Auto-generate initial report if none exists
      const evaluationInput: DisjointEvaluationInput = {
        enrolmentSession: null,
        evaluationSession: null,
        participantId: "P01-Parkinsons",
      };
      const evaluator = new RealWebcamEvaluator(evaluationInput);
      report = evaluator.evaluateAll();
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    }

    return NextResponse.json({
      ok: true,
      success: true,
      report,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "run_evaluation";

    if (action === "run_evaluation") {
      const participantId = body.participantId || "P01-Parkinsons";
      let enrolmentSession: WebcamRecordedSession | null = null;
      let evaluationSession: WebcamRecordedSession | null = null;

      if (body.enrolmentSessionId) {
        const p = path.join(RECORDED_SESSIONS_DIR, `${body.enrolmentSessionId}.json`);
        if (fs.existsSync(p)) enrolmentSession = JSON.parse(fs.readFileSync(p, "utf-8"));
      }
      if (body.evaluationSessionId) {
        const p = path.join(RECORDED_SESSIONS_DIR, `${body.evaluationSessionId}.json`);
        if (fs.existsSync(p)) evaluationSession = JSON.parse(fs.readFileSync(p, "utf-8"));
      }

      if (body.useLatestSessions && (!enrolmentSession || !evaluationSession)) {
        ensureRecordedSessionsDir();
        const files = fs.readdirSync(RECORDED_SESSIONS_DIR).filter(f => f.endsWith(".json"));
        for (const file of files) {
          try {
            const sess = JSON.parse(fs.readFileSync(path.join(RECORDED_SESSIONS_DIR, file), "utf-8")) as WebcamRecordedSession;
            if (!enrolmentSession && sess.sessionType === "ENROLMENT") enrolmentSession = sess;
            if (!evaluationSession && sess.sessionType === "INDEPENDENT_EVAL") evaluationSession = sess;
          } catch { /* ignore */ }
        }
      }

      const evaluationInput: DisjointEvaluationInput = {
        enrolmentSession,
        evaluationSession,
        participantId,
      };
      const evaluator = new RealWebcamEvaluator(evaluationInput);
      const report = evaluator.evaluateAll();

      ensureDirs();
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

      return NextResponse.json({
        ok: true,
        success: true,
        message: `Evaluated ${report.totalSamples} held-out samples across B0, B1, and B2.`,
        report,
      });
    }

    if (action === "record_sample") {
      const landmarks = body.landmarks as HandLandmark2D[];
      const targetGesture = (body.targetGesture || "NONE") as RecognizedGesture | "NONE";
      const lighting = body.lighting || "NORMAL_DIFFUSE";
      const visibility = body.visibility || "FULL_VISIBILITY";
      const movement = body.movement || "NOMINAL";
      const isNegativeHold = body.isNegativeHold === true || targetGesture === "NONE";
      const negativeHoldType = body.negativeHoldType || undefined;
      const notes = body.notes || undefined;

      // Privacy Check: ensure no base64 video frame data is submitted
      if (body.videoFrame || body.imageData || body.image) {
        return NextResponse.json(
          { ok: false, success: false, error: "Privacy violation: Raw video pixels and images cannot be stored." },
          { status: 400 }
        );
      }

      if (!landmarks || landmarks.length !== 21) {
        return NextResponse.json(
          { ok: false, success: false, error: "Invalid landmarks: expected exactly 21 normalized coordinates." },
          { status: 400 }
        );
      }

      const sample: EvaluationSample = {
        id: `rec_eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        targetGesture,
        landmarks: landmarks.map(p => ({ x: Number(p.x.toFixed(4)), y: Number(p.y.toFixed(4)), z: p.z !== undefined ? Number(p.z.toFixed(4)) : undefined })),
        lighting,
        visibility,
        movement,
        isNegativeHold,
        negativeHoldType,
        sessionType: "INDEPENDENT_EVAL",
        dataProvenance: "GENUINE_WEBCAM",
        notes,
      };

      const samples = loadRecordedSamples();
      samples.push(sample);
      saveRecordedSamples(samples);

      return NextResponse.json({
        ok: true,
        success: true,
        message: `Recorded evaluation landmark sample [${targetGesture}] (${samples.length} total samples in independent eval ledger).`,
        sampleId: sample.id,
        totalRecorded: samples.length,
      });
    }

    if (action === "save_session") {
      const session = body.session as WebcamRecordedSession;

      // Validate session structure
      if (!session || !session.sessionId || !session.participantId || !session.sessionType || !session.recordedAt || !Array.isArray(session.trials)) {
        return NextResponse.json(
          { ok: false, success: false, error: "Invalid session payload: missing required fields." },
          { status: 400 }
        );
      }

      if (!["ENROLMENT", "INDEPENDENT_EVAL"].includes(session.sessionType)) {
        return NextResponse.json(
          { ok: false, success: false, error: "Invalid sessionType: must be 'ENROLMENT' or 'INDEPENDENT_EVAL'." },
          { status: 400 }
        );
      }

      // Privacy Check: ensure no base64 video frame data is submitted in any frame
      for (const trial of session.trials) {
        for (const frame of trial.frames) {
          if ((frame as any).videoFrame || (frame as any).imageData || (frame as any).image) {
            return NextResponse.json(
              { ok: false, success: false, error: "Privacy violation: Raw video pixels and images cannot be stored in session frames." },
              { status: 400 }
            );
          }
          // Validate landmarks
          if (!frame.landmarks || frame.landmarks.length !== 21) {
            return NextResponse.json(
              { ok: false, success: false, error: `Invalid landmarks in trial ${trial.trialId}: expected exactly 21 normalized coordinates.` },
              { status: 400 }
            );
          }
        }
      }

      ensureRecordedSessionsDir();
      const filePath = path.join(RECORDED_SESSIONS_DIR, `${session.sessionId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2));

      let totalFrames = 0;
      for (const trial of session.trials) {
        totalFrames += trial.frames.length;
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: `Saved ${session.sessionType} session [${session.sessionId}] with ${session.trials.length} trials and ${totalFrames} frames.`,
        sessionId: session.sessionId,
        trialCount: session.trials.length,
        frameCount: totalFrames,
      });
    }

    if (action === "run_temporal_evaluation") {
      const participantId = body.participantId || "P01-Parkinsons";

      console.log(`[INFO] Running Temporal Evaluation for participant ${participantId}...`);
      const temporalReport = await runFullTemporalEvaluation(participantId);

      ensureDirs();
      fs.writeFileSync(TEMPORAL_REPORT_PATH, JSON.stringify(temporalReport, null, 2));

      return NextResponse.json({
        ok: true,
        success: true,
        message: `Temporal evaluation complete: S₁=${temporalReport.firstAttemptSuccess.rate.toFixed(1)}%, FA/hr=${temporalReport.continuousFalseActivations.falseActivationsPerHour.toFixed(2)}`,
        report: temporalReport,
      });
    }

    return NextResponse.json(
      { ok: false, success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
