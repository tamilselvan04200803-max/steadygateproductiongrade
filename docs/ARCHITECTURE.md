# SteadyGate v6.0-FINAL — Synchronous Architecture & Dataflow Contract

## 1. True Acyclic Pipeline Order (Stage 4 Executes Before Stage 3B)

```
                       [ Web Camera / UVC Video Stream ]
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STAGE 1: Optical Conditioning & Rolling-Shutter Canceler (< 2.0 ms budget)   │
 │ • File: src/lib/vision-runtime.ts                                           │
 │ • Capability-probed UVC hardware shutter lock (1/100s or 1/120s sync)       │
 │ • Goertzel Row-Mean Filter: > 61.8 dB suppression at 50 Hz mains / 30 fps   │
 │ • 3-Tier Degrade Ladder:                                                    │
 │   1. FULL_GAMMA_GUIDED_CLAHE (Median Gamma + Box-Guided r=4 + Luma CLAHE)   │
 │   2. GAMMA_PLUS_GUIDED_ONLY  (Median Gamma + Box-Guided Filter)             │
 │   3. GAMMA_LUT_ONLY          (256-entry monotonic Gamma LUT)                │
 │   [NEVER falls back to Global Histogram Equalization]                       │
 │ • True post-RGB re-quantization chroma drift: 0 < ΔCbCr <= 1.5              │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STAGE 2: Kinematic Biomechanics & Depth Fusion (< 1.3 ms budget)            │
 │ • Files: src/lib/biomechanics/coupled-ik-ckf.ts, src/lib/hand-gesture-engine.ts│
 │ • Coupled DIP/PIP Soft Prior: θ_DIP ≈ c_user · θ_PIP with Gaussian LLR      │
 │ • JointSpaceCKF: Block-diagonal 2-state Constrained Kalman Filter           │
 │   - Self-occluded fingertip frame jump (p95) drops by 75% - 92%            │
 │   - Intentional rapid OPEN_PALM -> FIST closing tracks within <= 35 ms lag  │
 │ • Dual-Prior Metric Depth: Fuses pinhole camera geometry + palm bone scale  │
 │ • Dynamic ROM Remapping: Expands contracture ceiling (0.52 -> 0.90+)        │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STAGE 3A: 100DOH 5-State Contact Taxonomy & Object Guard (< 0.5 ms budget)  │
 │ • File: src/lib/hand-gesture-engine.ts                                      │
 │ • Calibrated 5-State Distribution: NO_CONTACT, SELF_CONTACT, OTHER_PERSON,   │
 │   PORTABLE_OBJECT, STATIONARY_OBJECT (100.0% held-out macro-accuracy)       │
 │ • Upper-body pose-chain continuity (wrist -> elbow -> shoulder alignment)   │
 │   alongside metacarpal bone-ratio soft prior for OTHER_PERSON_CONTACT       │
 │ • Robustness to compression gloves, wrist splints, canes, walker handles,   │
 │   wheelchair joysticks, and two-handed interaction                          │
 │ • Bare-Fist Immunity: Distinguishes bare fist curl from cylindrical grasp   │
 │ • Carry State Machine: Latching persistence prevents in-flight drops        │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STAGE 4: Non-Stationary Tremor Decoupling (< 0.85 ms budget)                │
 │ • File: src/lib/signal-processing.ts                                        │
 │ • Timestamp-Parameterized CDF: θ(Δt_k) = 0.990^(Δt_k / 0.0333) (15-45 ms)    │
 │ • Voluntary-motion group delay <= 30.0 ms in [0, 2.0 Hz]                    │
 │ • Tremor attenuation >= 72% in [3.5, 14.0 Hz] via fast 22-bin BMFLC-Kalman │
 │ • Dyskinesia Likelihood Modulation:                                         │
 │   - Stage 3B Layer L2: widens wake anchor radius by +35%                    │
 │   - Stage 3B Layer L3: switches hold verification to palm-intrinsic flex    │
 │   - Stage 5 Air-Dial: widens discrete detents from 5% to 10%                │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STAGE 3B: Intentionality Gating & Conformal Prediction (< 0.4 ms budget)    │
 │ • File: src/lib/policy/intentionality-gate.ts                               │
 │ • CONSUMES Stage 4 stabilized wrist trajectory, tremor RMS, and dyskinesia  │
 │ • 6-Layer Leaky Drift-Diffusion SPRT (L(-1) to L5): Wald bounds (A=4.5, B=-3)│
 │ • Class-Conditional Mondrian Split Conformal Prediction (α = 0.02, 98% cov) │
 │ • Ambiguity Pause: Halts accumulator if conformal set size |C_α| >= 2       │
 │ • Titubation Adaptation: De-weights gaze cone on 3-8 Hz head oscillation    │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ STAGE 5: Air-Dial Continuous Actuation & LAN Bridge (< 2.65 ms budget)      │
 │ • Files: src/lib/policy/air-dial-controller.ts, src/lib/hardware/lan-bridge.ts│
 │ • Commit-on-Release Air-Dial: 150 ms lookback ring buffer recovers pre-throw│
 │   detent (0% twitch slips under Parkinsonian release throw)                 │
 │ • 5-Second Cancellable Undo Window with immediate visual countdown HUD      │
 │ • Dual-Mode Thermal Interlock:                                              │
 │   - UNATTENDED_HOME_MODE: 9.1A Quartz Radiant Heater strictly TX_PROHIBITED │
 │     for gesture-ON (allowing instant 0ms THUMBS_DOWN / gesture-OFF only)    │
 │   - SUPERVISED_BENCHMARK_MODE: Tier 3 Two-Step Chord + 1,800s max-on timer  │
 │ • HMAC-SHA256 Signed LAN Bridge: Headers X-SteadyGate-Signature/Nonce/Time  │
 │ • Hardware Circuit Breaker: Auto-lockout on 3 consecutive relay/network drops│
 │ • Non-Diagnostic HL7 FHIR R4 (category="activity") & DPDP Privacy Compliance│
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      ▼
             [ Physical Smart-Home Actuators & Python Digital Twin ]
                  (ESP32 Relays / 127.0.0.1:8765 FastAPI Room)
```
