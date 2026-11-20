---
name: temporal-dwell-evaluation
description: Activate when evaluating multi-frame time-series streaming, dwell ring confirmation, Stage 4 tremor decoupling, Stage 3B intentionality gating, true First-Attempt Success (S1), or continuous soak False Activation Rates (FA/hr).
---

# Temporal Time-Series, Dwell Accumulator & Continuous Soak Evaluation Skill

## Overview
Unlike static image classifiers, SteadyGate is an **interactive temporal controller** designed to operate at 30 FPS. Intention is confirmed only when a voluntary posture is held stably through the full biomechanical pipeline and completes the required dwell duration without involuntary twitch triggers.

This skill details the temporal architecture, dwell confirmation logic, and methods for measuring true event-level metrics.

---

## 1. The Acyclic Pipeline Contract

> **Stage 4 MUST run BEFORE Stage 3B.**  
> Stage 3B consumes the voluntary trajectory $y_{\text{clean}}$, tremor RMS $A_{\text{rms}}$, and `dyskinesiaLikelihood` output by Stage 4, guaranteeing that intention layers evaluate stabilized biomechanics rather than trembling raw coordinates.

```
RAW WEBCAM (30 FPS)
       │
       ▼
[Stage 1: Optical Preprocessing] (Luma-only, flicker suppression, CLAHE <2.0ms)
       │
       ▼
[Stage 2: Biomechanical Perception] (MediaPipe WASM, JointSpaceCKF, 21 Keypoints)
       │
       ▼
[Stage 4: Signal Decoupling] (BMFLC-Kalman notch filter, tremor attenuation >=72%)
       │
       ├── voluntary trajectory y_clean
       ├── tremor RMS A_rms
       └── dyskinesia likelihood
       │
       ▼
[Stage 3B: Intentionality Gating] (SPRT sequential probability ratio, attention floor)
       │
       ▼
[Dwell Ring Accumulator] (Requires sustained hold for requiredHoldMs: 400-800ms)
       │
       ▼
APPLIANCE ACTUATION (Only after dwell completion)
```

---

## 2. Temporal Metric Definitions

### 2.1 True First-Attempt Success Rate ($S_1$)
- **Definition:** Percentage of intentional command attempts where the user forms the gesture and the Dwell Ring reaches 100% confirmation within **$1.5\text{ seconds}$ (45 frames @ 30 FPS)** of posture onset.
- **Failure Conditions:**
  - Dwell accumulator times out or resets due to jitter/hand drop.
  - False intermediate classification triggers a different gesture.
  - Required hold duration exceeds $1.5\text{ seconds}$.
- **Measurement Constraint:** Cannot be computed from static single frames. Must be evaluated on continuous 30 FPS time-series landmark streams.

### 2.2 Continuous False Activation Rate ($\text{FA/hr}$)
- **Definition:** The number of accidental smart-home appliance actuations committed during continuous casual, non-command hand activity:
  $$\text{FA/hour} = \frac{N_{\text{committed\_actuations}}}{\text{Observation Duration (hours)}}$$
- **Test Protocol:** Stream at least 60 minutes (108,000 frames) of unconstrained conversational gesturing, face touching, and object holds (mug, phone, book). Target: $\le 0.05\text{ FA/hr}$.

---

## 3. Toolchain & Testing

```bash
# 1. Run the continuous clinical soak replay (62.5h simulated pathological stream)
npm run test:soak

# 2. Run the Challenger 2 temporal frequency drift & noise injection suite
npm run test:challenger:2

# 3. Test gesture voter commit-on-release & flicker suppression
npm run test:gesture

# 4. Verify full 8-step verification gate
npm test
```
