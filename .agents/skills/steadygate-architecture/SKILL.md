---
name: steadygate-architecture
description: Activate when modifying MediaPipe perception, JointSpaceCKF, BMFLC-Kalman filter, Stage 3B intentionality gating, Stage 4 tremor decoupling, or appliance-control logic.
---

# SteadyGate Architecture & Pipeline Engineering Skill

## Overview
This skill governs changes to SteadyGate's core 5-Stage Acyclic Perception & Control Pipeline. SteadyGate is a local-first, zero-cloud assistive system operating at a strict **$< 16.8\text{ ms}$ total frame budget** ($< 7.70\text{ ms}$ internal compute budget, measured $p50 = 0.409\text{ ms}, p95 = 0.888\text{ ms}$).

## Critical Architectural Invariants

### 1. The Acyclic Pipeline Contract (Stage 4 Before Stage 3B)
> [!IMPORTANT]
> **Stage 4 MUST execute BEFORE Stage 3B.**  
> - **Stage 4** (`src/lib/signal-processing.ts`): Continuous-time BMFLC-Kalman decoupler. It extracts the clean voluntary trajectory $y_{\text{clean}}$, tremor RMS amplitude $A_{\text{rms}}$, and dyskinesia likelihood score.
> - **Stage 3B** (`src/lib/policy/intentionality-gate.ts`): Consumes $y_{\text{clean}}$, $A_{\text{rms}}$, and `dyskinesiaLikelihood` from Stage 4.  
> - **Rationale:** Intention evaluation layers MUST evaluate tremor-stabilized voluntary biomechanics, not raw oscillating coordinates. Never invert this order.

### 2. Strict Frame Budget Breakdown
Total pipeline budget: **$< 7.70\text{ ms}$ internal p95**:
- Stage 1 (Optical Conditioning): $< 2.0\text{ ms}$
- Stage 2 (Coupled IK & JointSpaceCKF): $< 1.3\text{ ms}$
- Stage 3A (100DOH Contact Taxonomy): $< 0.5\text{ ms}$
- Stage 4 (BMFLC-Kalman Tremor Decoupler): $< 0.85\text{ ms}$
- Stage 3B (Intentionality & Conformal Gate): $< 0.4\text{ ms}$
- Stage 5 (Air-Dial & LAN Bridge): $< 2.65\text{ ms}$

---

## Detailed Stage Implementation Guidelines

### Stage 1: Optical Conditioning & Shutter Lock (`src/lib/vision-runtime.ts`)
- **UVC Hardware Shutter Lock**: Probe camera capabilities to lock shutter at $1/100\text{ s}$ ($50\text{ Hz}$) or $1/120\text{ s}$ ($60\text{ Hz}$).
- **Goertzel Filter**: Row-mean sampling for $>60\text{ dB}$ suppression of AC mains flicker.
- **3-Tier Degrade Ladder**:
  1. `FULL_GAMMA_GUIDED_CLAHE`: Median Gamma + Box-Guided ($r=4$) + Luma-only CLAHE ($\Delta\text{CbCr} \le 1.5$).
  2. `GAMMA_PLUS_GUIDED_ONLY`: Median Gamma + Box-Guided filter.
  3. `GAMMA_LUT_ONLY`: 256-entry monotonic lookup table.
  *NEVER fallback to global histogram equalization (causes severe skin-tone washout).*

### Stage 2: Kinematic Biomechanics & Depth Fusion (`src/lib/biomechanics/coupled-ik-ckf.ts`)
- **Coupled DIP/PIP Kinematics**: Enforce soft constraint $\theta_{\text{DIP}} \approx c_{\text{user}} \cdot \theta_{\text{PIP}}$ with Gaussian log-likelihood penalty.
- **JointSpaceCKF**: Block-diagonal 2-state Constrained Kalman Filter to suppress fingertip occlusion jumps ($75\%\text{–}92\%$ jitter reduction).
- **Contracture Exemption**: Automatically expand ROM ceiling from $0.52 \to 0.90+$ when arthritic profile is detected.
- **Lag Invariant**: Rapid hand closing (`OPEN_PALM` $\to$ `FIST`) must track within $\le 35\text{ ms}$ lag.

### Stage 3A: 100DOH Contact Taxonomy & Object Guard (`src/lib/hand-gesture-engine.ts`)
- 5 calibrated contact states: `NO_CONTACT`, `SELF_CONTACT`, `OTHER_PERSON`, `PORTABLE_OBJECT`, `STATIONARY_OBJECT`.
- **Bare-Fist Immunity**: Distinguish bare fist flexion from cylindrical tool grasp ($0 / 1,030$ false blocks on bare hands).
- **Upper-Body Pose Continuity**: Verify wrist $\to$ elbow $\to$ shoulder alignment.
- Support assistive aids: Invariance to compression gloves, wrist splints, canes, walker handles, and wheelchair joysticks.

### Stage 4: Non-Stationary Tremor Decoupling (`src/lib/signal-processing.ts`)
- **Timestamped CDF Parameterization**:
  $$\theta(\Delta t_k) = 0.990^{(\Delta t_k / 0.0333)}$$
  Ensures numerical stability across variable camera intervals $\Delta t_k \in [15, 45]\text{ ms}$.
- **BMFLC-Kalman**: 22-bin block harmonic filter.
- **Performance Targets**: Tremor attenuation $\ge 72\%$ in $3.5\text{–}14.0\text{ Hz}$; voluntary group delay $\le 30.0\text{ ms}$ in $[0, 2.0\text{ Hz}]$.
- **Dyskinesia Likelihood Engine**: Widen wake radius by $+35\%$ and detents to $10\%$ when choreic motions are present.

### Stage 3B: Intentionality Gating & Conformal Prediction (`src/lib/policy/intentionality-gate.ts`)
- **6-Layer Leaky Drift-Diffusion SPRT**:
  - $L(-1)$: Spatial Anchor (radius $\le 45\text{ mm}$)
  - $L0$: Pose stability & orientation cone
  - $L1$: Gaze & face intent alignment (widened for titubation)
  - $L2$: Voluntary kinematic continuity
  - $L3$: Dwell hold verification (palm-intrinsic flex under dyskinesia)
  - $L4$: Safety chord validation
  - $L5$: Actuator dispatch authorization
- **Wald Thresholds**: Upper commit $A = 4.5$, lower abort $B = -3.0$.
- **Mondrian Split Conformal Prediction**: Coverage $\ge 98\%$ ($\alpha = 0.02$). If conformal prediction set size $|C_\alpha| \ge 2$, trigger **Ambiguity Pause**.

### Stage 5: Air-Dial Continuous Actuation & LAN Bridge (`src/lib/policy/air-dial-controller.ts`, `src/lib/hardware/lan-bridge.ts`)
- **Lookback Ring Buffer**: $150\text{ ms}$ lookback on release to discard Parkinsonian release twitch slips.
- **Undo Window**: $5.0\text{ s}$ cancellable safety buffer with live visual HUD countdown.
- **Thermal Safety Interlock**: High-amperage heating devices ($9.1\text{ A}$ Quartz Heater) are strictly prohibited from gesture-ON in unattended mode, but allow $0\text{ ms}$ emergency cutoff.
- **HMAC-SHA256 LAN Bridge**: Every packet signed with `X-SteadyGate-Signature`, `X-SteadyGate-Nonce`, `X-SteadyGate-Timestamp` and verified against an LRU `NonceCache`.

---

## Modification & Verification Workflow

When modifying any pipeline file:
1. Run strict TypeScript check:
   ```bash
   npm run typecheck
   ```
2. Run ESLint checks:
   ```bash
   npm run lint
   ```
3. Run the specific pipeline unit tests:
   ```bash
   npm run test:gesture
   npm run test:challenger:1
   npm run test:challenger:2
   ```
4. Verify overall pipeline latency remains below $7.70\text{ ms}$ p95:
   ```bash
   npm test
   ```
