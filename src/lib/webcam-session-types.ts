/**
 * SteadyGate v6.0 — Webcam Landmark Stream Recording Types
 * ---------------------------------------------------------
 * Privacy Invariant: Only 21 normalized landmarks (Float32Array[21 * 2/3]), timestamps,
 * and optical telemetry may be recorded. Zero raw video pixels or camera images.
 * DPDP / HL7 FHIR R4 compliant.
 */

/** 2D/3D Normalized Hand Landmark (MediaPipe format) */
export interface HandLandmark2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** Recognized gesture types + NONE for negative holds */
export type RecognizedGesture =
  | "OPEN_PALM"
  | "THUMBS_UP"
  | "VICTORY"
  | "POINTING_UP"
  | "FIST"
  | "THUMBS_DOWN"
  | "PINCH"
  | "CALL_ME"
  | "THREE_FINGERS"
  | "FOUR_FINGERS"
  | "UNKNOWN";

/** Optical telemetry computed per frame from landmarks only */
export interface FrameOptics {
  /** Mean luminance (0..1) estimated from landmark visibility distribution */
  meanLuminance: number;
  /** Contrast (standard deviation of landmark visibility) */
  contrast: number;
  /** Signal-to-noise ratio in dB (estimated from landmark jitter) */
  snrDb: number;
}

/** Single recorded frame in a webcam session */
export interface WebcamRecordedFrame {
  /** Absolute timestamp in milliseconds since epoch */
  timestampMs: number;
  /** Zero-based frame index within the trial */
  frameIndex: number;
  /** 21 normalized MediaPipe hand landmarks */
  landmarks: HandLandmark2D[];
  /** Optical telemetry derived from landmarks (zero camera pixels) */
  optics: FrameOptics;
}

/** A single continuous gesture hold trial within a session */
export interface WebcamRecordedTrial {
  /** Unique trial identifier */
  trialId: string;
  /** Target gesture for this trial, or "NONE" for negative holds */
  targetGesture: RecognizedGesture | "NONE";
  /** True if this is a negative hold (casual idle, object hold, etc.) */
  isNegativeHold: boolean;
  /** Human-readable notes about recording conditions */
  conditionNotes: string;
  /** Continuous frame sequence for this trial (10-45 frames typical) */
  frames: WebcamRecordedFrame[];
}

/** Session types for the disjoint session protocol */
export type SessionType = "ENROLMENT" | "INDEPENDENT_EVAL";

/** Complete recorded webcam session with full provenance */
export interface WebcamRecordedSession {
  /** Unique session identifier */
  sessionId: string;
  /** Participant identifier (e.g., "P01-Parkinsons") */
  participantId: string;
  /** Session type in the disjoint protocol */
  sessionType: SessionType;
  /** ISO 8601 timestamp when session recording started */
  recordedAt: string;
  /** All trials recorded in this session */
  trials: WebcamRecordedTrial[];
}

/** Payload for saving a session via API */
export interface SaveSessionPayload {
  action: "save_session";
  session: WebcamRecordedSession;
}

/** Response from save_session API */
export interface SaveSessionResponse {
  ok: boolean;
  success: boolean;
  message?: string;
  sessionId?: string;
  error?: string;
}

/** Payload for listing sessions via API */
export interface ListSessionsPayload {
  action: "list_sessions";
}

/** Session summary for listing */
export interface SessionSummary {
  sessionId: string;
  participantId: string;
  sessionType: SessionType;
  recordedAt: string;
  trialCount: number;
  totalFrames: number;
  commandTrials: number;
  negativeTrials: number;
  gesturesCovered: (RecognizedGesture | "NONE")[];
}

/** Response from list_sessions API */
export interface ListSessionsResponse {
  ok: boolean;
  success: boolean;
  sessions?: SessionSummary[];
  error?: string;
}

/** Frame payload for real-time recording (sent from UI) */
export interface RecordFramePayload {
  action: "record_frame";
  sessionId: string;
  trialId: string;
  frame: WebcamRecordedFrame;
}

/** Trial control payload */
export interface TrialControlPayload {
  action: "start_trial" | "end_trial";
  sessionId: string;
  trialId?: string; // required for end_trial
  targetGesture?: RecognizedGesture | "NONE";
  isNegativeHold?: boolean;
  conditionNotes?: string;
}

/** Union of all valid API payloads */
export type WebcamEvalApiPayload =
  | SaveSessionPayload
  | ListSessionsPayload
  | RecordFramePayload
  | TrialControlPayload;

/** Evaluation gestures for recording guidance */
export const RECORDING_GESTURES: (RecognizedGesture | "NONE")[] = [
  "OPEN_PALM",
  "FIST",
  "VICTORY",
  "POINTING_UP",
  "THUMBS_UP",
  "NONE",
];

/** Recommended frame counts per trial type */
export const TRIAL_FRAME_RECOMMENDATIONS: Record<RecognizedGesture | "NONE", { min: number; max: number; typical: number }> = {
  OPEN_PALM: { min: 10, max: 45, typical: 30 },
  FIST: { min: 10, max: 45, typical: 30 },
  VICTORY: { min: 10, max: 45, typical: 30 },
  POINTING_UP: { min: 10, max: 45, typical: 30 },
  THUMBS_UP: { min: 10, max: 45, typical: 30 },
  THUMBS_DOWN: { min: 10, max: 45, typical: 30 },
  PINCH: { min: 10, max: 45, typical: 30 },
  CALL_ME: { min: 10, max: 45, typical: 30 },
  THREE_FINGERS: { min: 10, max: 45, typical: 30 },
  FOUR_FINGERS: { min: 10, max: 45, typical: 30 },
  UNKNOWN: { min: 10, max: 45, typical: 30 },
  NONE: { min: 600, max: 1800, typical: 900 }, // 60 seconds at 15 FPS = 900 frames
};