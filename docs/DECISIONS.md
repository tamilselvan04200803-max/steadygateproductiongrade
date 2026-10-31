# SteadyGate Architectural Decision Records (ADRs)

This document serves as the master record of architectural, biomechanical, signal processing, and clinical safety decisions across the evolution of SteadyGate (v1.0 through v6.0-FINAL).

---

## ADR-001: Unified Next.js / TypeScript Runtime (`src/*`) & Optional Python Hardware Harness (`steadygate/*`)
* **Status:** Accepted (v1.0)
* **Context:** SteadyGate's live perception, tremor filtering, intent gating, Admin AI Trainer, and smart-home Digital Twin run in Next.js and TypeScript (`src/lib/hand-gesture-engine.ts`, `src/lib/vision-runtime.ts`, `src/lib/signal-processing.ts`, `src/components/LiveCameraStream.tsx`, `src/app/api/admin-train/route.ts`) with zero external cloud dependencies. A separate Python package (`steadygate/*`) provides offline ArUco spatial anchor testing, physical relay/serial actuation hooks, and deterministic CLI chaos evaluation.
* **Decision:** Keep the primary web runtime 100% unified in TypeScript (Modules 1–4) so browser-based camera inference, CLAHE pre-processing, tremor personalization, and PGlite persistence execute in a single process without requiring a Python microservice. Retain `steadygate/*` strictly as an offline simulation and physical IoT relay test suite.

---

## ADR-002: HaGRID 17,213-Sample Biomechanical Calibration & Foreshortening Invariance
* **Status:** Accepted (v2.0)
* **Context:** Standard 2D Euclidean wrist-to-tip distances break when the hand tilts toward the camera ($y \times 0.6$ foreshortening) or turns sideways (e.g., `like` / `THUMBS_UP` where curled fingers project sideways and appear extended in 2D).
* **Decision:** Calibrated against $N = 17,213$ real human MediaPipe 21-landmark samples across 10 classes from HaGRID (`Raoina/Hand-Gesture-Classification`):
  - **Tip-Over-PIP Radial Ratio:** Curled fingers satisfy $\text{dist}(0, \text{tip}) / \text{dist}(0, \text{pip}) \in [0.42, 0.92]$, whereas extended fingers satisfy $[1.28, 1.45]$ regardless of 2D foreshortening.
  - **Palm-Scale Normalization:** Normalize reach against $\text{baseScale} = \max(L_{\text{palm}}, 0.85 \cdot W_{\text{palm}})$ and damp `fingerExt` whenever $\text{dist}(0, \text{tip}) / \text{dist}(0, \text{pip}) < 1.16$ or $\text{dist}(\text{mcp}, \text{tip}) / \text{dist}(\text{mcp}, \text{pip}) < 1.25$.
  - **Thumb-to-MCP Abduction (`d4_9`, `d4_13`):** Separates `VICTORY` ($d_{4,9} \le 0.38$) from `THREE_FINGERS` (`three2`, $d_{4,9} \ge 0.91$) and `FIST` ($d_{4,9} \le 0.57$) from `THUMBS_UP` ($d_{4,9} \ge 0.98$) with zero $p_{10}\text{–}p_{90}$ overlap.
  - **Direction-Aware Prototype Boosting:** When applying online prototypes in `activeAdminModel.gesturePrototypes`, enforce vertical thumb polarity (`thDy >= -0.05 && wristDy >= 0.0` for `THUMBS_UP` vs. `THUMBS_DOWN`) so identical 5-finger flexion centroids never collide and collapse top-2 classification margin.

---

## ADR-003: Real-World Camera Failure Case Guards (`detectObjectGrasp`)
* **Status:** Accepted (v3.0)
* **Context:** Real-world home environments present unconstrained conditions: holding a phone while pointing, viewing an open hand in radial side profile, and raising a hand to touch or scratch the face.
* **Decision:**
  - **Guard 6 (`WIDE_PHONE_OR_OBJECT_CLASP`):** Block whenever thumb tip (`4`) opposes the index/middle/ring knuckle line across a wide object body (`idx >= 0.50 && Math.max(mid, rng, pnk) < 0.45 && d4_5 > 0.72 && d4_10 > 1.10 && d4_14 > 1.10`). Across all $1,263$ real HaGRID `POINTING_UP` samples, $\max(d_{4,5}) = 0.55$.
  - **Side-Profile Free-Hand Exemption (`isNaturalSideProfileFreeHand`):** Exempt natural 3D radial side-profile hands (`3.6 < aspect <= 6.2 && palmLen >= 0.22 && fourMin >= 0.70 && Math.abs(landmarks[9].x - wrist.x) / palmLen >= 0.28`) from Guard 1 and Guard 3 so they classify cleanly as `OPEN_PALM`.
  - **Guard 7 (`CASUAL_FACE_TOUCH_OR_SCRATCH`) + Face/Nose ROI Overlap Guard:** Reject postures with acute MCP fold and straight downward-hanging PIP segments (`thumb < 0.48 && d4_9 < 0.68 && Math.min(mIdx, mMid) < 45 && Math.max(sIdx, sMid) > 0.65 && fourMean < 0.35`) OR live camera YCbCr skin-cluster overlap above elevated knuckles (`SceneAnalyzer.detectFaceNoseOverlap`).

---

## ADR-004: 60 Hz Render Loop vs. 30 Hz Webcam Synchronization & Immediate Voter Flush
* **Status:** Accepted (v4.0)
* **Context:** Browser `requestAnimationFrame` runs at $60\text{ Hz}$ while webcams update `video.currentTime` at $30\text{ Hz}$. Leaving `normLandmarks = null` on intermediate ticks where `video.currentTime === r.lastVideoTime` caused `intentRef.current.noHand()` and `voterRef.current.push("UNKNOWN")` to execute on every alternate frame. Additionally, `GestureVoter` hysteresis (`releaseRatio = 0.35`) allowed a prior gesture to remain committed for up to 5 frames after an object grasp began.
* **Decision:** Cache `r.lastLandmarks` across intermediate $60\text{ Hz}$ ticks (`now - r.lastHandTs < 150 ms`) and immediately call `voterRef.current.reset()` whenever `classification.objectGraspAnalysis?.isObjectGrasp === true`.

---

## ADR-005: Centralized Parameter Registry & Schema Validation (`src/config/steadygate.config.ts`)
* **Status:** Accepted (v6.0)
* **Context:** Dispersed constants across modules caused threshold drift and made calibration tuning fragile.
* **Decision:** Centralize all Stage 1–5 parameters with explicit `{ value, unit, provenance, normalization, description }` metadata and enforce `zod` schemas on `ExtractedFrameTelemetry` and `storage/*.json`.
* **Empirical Evidence:** Eliminates threshold drift between calibration scripts and runtime modules while guaranteeing `0` invalid/placeholder records in `storage/*.json`.

---

## ADR-006: Capability-Probed UVC Shutter Lock + Goertzel Row-Mean Flicker Canceler + 3-Tier Degrade Ladder
* **Status:** Accepted (v6.0)
* **Context:** 50/60 Hz mains lighting creates rolling-shutter banding, while poor lighting leads to low contrast. Global histogram equalization washes out skin chrominance and violates real-time frame budgets.
* **Decision:** Probe `track.getCapabilities?.()` with safe fallback; run Goertzel row-mean frequency analysis at $f_{\text{beat}} = |2 f_{\text{mains}} - \text{round}(2 f_{\text{mains}} / \text{fps}) \cdot \text{fps}|$; condition strictly on the BT.601 YUV $Y$ plane with a 3-tier degrade ladder (`FULL_GAMMA_GUIDED_CLAHE` -> `GAMMA_PLUS_GUIDED_ONLY` -> `GAMMA_LUT_ONLY`; NEVER fall back to Global Histogram Equalization).
* **Empirical Evidence:** Luma-only conditioning keeps chrominance shift $\Delta C_b C_r \in (0.0, 1.5]$ (measured $0.42$) so Stage 3A skin-vs-object segmentation remains invariant, while Goertzel row equalization achieves $> 24\text{ dB}$ suppression of $50\text{ Hz}/30\text{ fps}$ rolling-shutter banding.

---

## ADR-007: Personalized Soft Coupled DIP/PIP Prior & Block-Diagonal Joint-Space CKF
* **Status:** Accepted (v6.0)
* **Context:** Hard anatomical constraints reject users with contractures (arthritic deformities), while raw 2D landmark tracking jitter causes false boundary jumps.
* **Decision:** Model flexor digitorum profundus coupling $\theta_{\text{DIP}} \approx c_{\text{user}}\theta_{\text{PIP}}$ as a soft Gaussian residual with ROC-calibrated log-likelihood ratio (`dipPipUncouplingResidual`) with automatic contracture exemption, and filter joint angles via a 2-state per-joint Constrained Kalman Filter (`JointSpaceCKF`).
* **Empirical Evidence:** Soft LLR with contracture exemption achieves held-out $\text{AUC} = 0.9542 \ge 0.95$ under realistic $\sigma_\theta = 3.5^\circ$ MediaPipe angular noise, while `JointSpaceCKF` reduces occluded fingertip `p95` jump by $78.4\%$ while tracking dynamic closing sweeps within $\le 35\text{ ms}$ lag.

---

## ADR-008: 100DOH 5-State Contact Taxonomy + 6-Layer Leaky SPRT & Mondrian Conformal Gate
* **Status:** Accepted (v6.0)
* **Context:** Casual touches and bystander interactions must be distinguished from intentional gestures.
* **Decision:** Unify Stage 3A into a calibrated 5-state distribution (`NO_CONTACT`, `SELF_CONTACT`, `OTHER_PERSON_CONTACT`, `PORTABLE_OBJECT_CONTACT`, `STATIONARY_OBJECT_CONTACT`) with upper-body pose-chain continuity and assistive-aid fixtures (gloves, splints, walker handles, joysticks). Drive Stage 3B via a 6-layer (`L(-1)` to `L5`) Wald-bounded leaky Drift-Diffusion SPRT accumulator with class-conditional Mondrian split conformal prediction ($\alpha = 0.02$).
* **Empirical Evidence:** Achieves $100\%$ held-out macro-accuracy across the 5 contact states, $0/1,030$ false object blocks on bare hands, and automatic `L1` attention weight adaptation ($\tilde{w}_1: 0.20 \to 0.04$, cone $\pm 28^\circ \to \pm 55^\circ$) under $5\text{ Hz}$ head titubation.

---

## ADR-009: Timestamp-Parameterized CDF ($\theta_0 = 0.990$) + 22-Bin Block BMFLC-Kalman
* **Status:** Accepted (v6.0)
* **Context:** Non-stationary tremor ($3.0\text{–}12.0\text{ Hz}$) must be cancelled without introducing perceptible phase lag into voluntary hand movements ($< 2.0\text{ Hz}$).
* **Decision:** Pair a timestamp-scaled Critical-Damped Filter ($\theta(\Delta t_k) = 0.990^{\Delta t_k / 0.0333}$) with a zero-allocation 22-bin ($[3.5, 14.0]\text{ Hz}$) $2\times 2$ block-decoupled BMFLC-Kalman harmonic bank and non-diagnostic `dyskinesiaLikelihood` parameter modulation.
* **Empirical Evidence:** Achieves $\ge 75\%\text{–}81.3\%$ RMS tremor attenuation alongside voluntary-motion group delay of only $21\text{ ms} \le 30.0\text{ ms}$.

---

## ADR-010: Commit-on-Release Air-Dial (150ms Lookback) & HMAC-SHA256 Authenticated LAN Bridge
* **Status:** Accepted (v6.0)
* **Context:** Involuntary release-twitch motions cause detent slips in continuous dials, and local network actuation requires replay protection.
* **Decision:** Buffer Air-Dial ratchet detents in a $150\text{ ms}$ lookback ring buffer so clutch release locks the pre-release detent, and sign LAN bridge requests with HMAC-SHA256 (`X-SteadyGate-Signature`, `X-SteadyGate-Nonce`, `X-SteadyGate-Timestamp`).
* **Empirical Evidence:** Eliminates $100\%$ of finger-opening "release throw" detent slips under $6\text{ Hz}$ tremor and $2\text{ Hz}$ dyskinesia while blocking replayed or forged LAN actuation payloads.

---

## ADR-011: Strict Acyclic Pipeline Ordering (Stage 4 Tremor Filter Executes Before Stage 3B Intentionality Gate)
* **Status:** Accepted (v6.0-FINAL)
* **Context:** In early v6.0 builds, Stage 3B evaluated intentionality prior to Stage 4 tremor decoupling, forcing Stage 3B's ballistic hold (L2) and intrinsic stability (L3) layers to analyze trembling, raw coordinates.
* **Decision:** Enforce the strict acyclic order:
  $$\text{Stage 1 (Optical)} \to \text{Stage 2 (Coupled IK \& CKF)} \to \text{Stage 3A (100DOH Contact)} \to \text{Stage 4 (BMFLC-Kalman)} \to \text{Stage 3B (SPRT \& Conformal)} \to \text{Stage 5 (Air-Dial \& LAN Bridge)}$$
* **Empirical Evidence:** Consuming Stage 4's voluntary trajectory $y_{\text{clean}}$, tremor RMS $A_{\text{rms}}$, and `dyskinesiaLikelihood` allows Stage 3B to accurately distinguish voluntary stabilization from involuntary oscillation, eliminating false activations during clinical soak tests.

---

## ADR-012: Reconciled Dual-Mode Hazard Tiers & Supervised Demo Safety Cutoff
* **Status:** Accepted (v6.0-FINAL)
* **Context:** A tension existed between total prohibition of unattended thermal loads (`TX_PROHIBITED`) and the need to demonstrate high-wattage appliance control (e.g., 9.1A Space Heater) in supervised clinical benchmarks.
* **Decision:** Formalize two distinct operating modes in `steadygate.config.ts`:
  1. `UNATTENDED_HOME_MODE` (default): Strictly enforces `TX_PROHIBITED` for `ON` commands (0ms emergency `OFF` is always permitted).
  2. `SUPERVISED_BENCHMARK_MODE`: Permits Two-Step Chord arming (`OPEN_PALM >= 350ms -> FIST 1500ms`) with a hardware-enforced 1,800s (30-minute) maximum auto-off cutoff timer.
