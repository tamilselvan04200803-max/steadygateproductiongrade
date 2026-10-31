# SteadyGate v6.0-FINAL — Tremor-Compensated Assistive Hand-Gesture Controller

[![Status](https://img.shields.io/badge/Release-v6.0--FINAL-success)](https://github.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![Verification](https://img.shields.io/badge/Verification-8%2F8%20Pass%20(100%25%20Green)-brightgreen)](./docs/VALIDATION_REPORT.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)

SteadyGate is a local-first, vision-based assistive smart-home control platform engineered for individuals with severe motor disorders (Parkinsonian resting tremor $4\text{–}6\text{ Hz}$, Essential Tremor $5\text{–}10\text{ Hz}$, Levodopa-Induced Dyskinesia $1\text{–}3\text{ Hz}$, Head Titubation $5\text{ Hz}$ with Facial Hypomimia, and Arthritic Finger Contracture).

Operating with **zero external cloud dependencies**, SteadyGate integrates MediaPipe 21-point hand perception, continuous-time harmonic Kalman filtering, a 5-state 100DOH contact taxonomy, and a 6-layer Leaky Drift-Diffusion SPRT gate with class-conditional Mondrian conformal prediction sets.

---

## 1. 5-Stage Acyclic Pipeline Architecture

The perception and control loop executes synchronously at **$< 16.8\text{ ms}$ total frame budget** ($< 7.70\text{ ms}$ internal budget, measured $p50 = 0.409\text{ ms}$, $p95 = 0.888\text{ ms}$) in a strict acyclic order:

```mermaid
flowchart TD
    VideoInput["Webcam Video Stream (30 FPS)"] --> S1["Stage 1: Optical Loop & Flicker Canceler<br/>• UVC capability-probed shutter lock<br/>• Goertzel row-mean 50/60 Hz cancellation (>20 dB)<br/>• 3-tier degrade ladder with luma-only CLAHE (ΔCbCr ≤ 1.5)"]
    S1 --> S2["Stage 2: 26-DoF Coupled IK & JointSpaceCKF<br/>• Soft coupled DIP/PIP kinematics (θ_DIP ≈ c θ_PIP)<br/>• Automatic arthritic contracture exemption (0.52 ROM)<br/>• Block-diagonal Constrained Kalman Filter (lag ≤ 35 ms)"]
    S2 --> S3A["Stage 3A: 100DOH 5-State Contact Taxonomy<br/>• Upper-body pose chain (wrist-elbow-shoulder continuity)<br/>• 0 / 1,030 false object blocks on bare hands<br/>• Assistive aid invariance (gloves, splints, canes, joysticks)"]
    S3A --> S4["Stage 4: Continuous-Time BMFLC-Kalman Filter<br/>• Timestamped CDF θ(Δt_k) = 0.990^(Δt_k / 0.0333)<br/>• 22-bin block BMFLC-Kalman (tremor attenuation ≥ 72%)<br/>• Voluntary group delay ≤ 30 ms; dyskinesia likelihood engine"]
    S4 -->|y_clean, A_rms, dyskinesiaLikelihood| S3B["Stage 3B: Intentionality & Conformal SPRT Gate<br/>• 6-Layer Leaky Drift-Diffusion SPRT accumulator<br/>• Mondrian split conformal sets (α = 0.02, coverage ≥ 98%)<br/>• Dynamic L1 titubation cone widening (±28° → ±55°)"]
    S3B -->|Intentional Commit| S5["Stage 5: Air-Dial & Authenticated LAN Bridge<br/>• Commit-on-Release Lookback Ring Buffer (150 ms rollback)<br/>• 5-second cancellable Undo window<br/>• HMAC-SHA256 authenticated LAN bridge with anti-replay"]
    S5 --> Actuation["Smart-Home Appliance / Hardware Relay"]
```

> **Acyclic Contract:** **Stage 4 runs BEFORE Stage 3B.**  
> Stage 3B consumes the voluntary trajectory $y_{\text{clean}}$, tremor RMS $A_{\text{rms}}$, and `dyskinesiaLikelihood` output by Stage 4, guaranteeing that intention layers evaluate stabilized biomechanics rather than trembling coordinates.

---

## 2. Repository Structure

For an exhaustive guide on directory responsibilities, file conventions, and architectural contracts, see [`docs/REPO_STRUCTURE.md`](./docs/REPO_STRUCTURE.md).

```
steadygate-prior-art-analysis/
├── .github/                       # CI/CD workflows, issue templates, and PR templates
│   └── workflows/ci.yml           # Automated multi-job GitHub Actions pipeline
├── docs/                          # Authoritative architectural and clinical documentation
│   ├── audits/                    # Historical audits, blueprints, and deviation ledgers
│   ├── reports/                   # Quantitative validation reports, soak data, and claims
│   ├── ARCHITECTURE.md            # Complete 5-Stage Acyclic Pipeline specification
│   ├── DECISIONS.md               # Master Architectural Decision Records (ADR-001 to ADR-012)
│   ├── REPO_STRUCTURE.md          # Comprehensive repository taxonomy and file map
│   └── VALIDATION_REPORT.md       # Flagship production validation and soak report
├── public/                        # Static assets and vendored MediaPipe WebAssembly models
├── reports/                       # Generated Python chaos lab metrics and stress evaluation
├── scripts/                       # Build, out-of-sample calibration, and verification runners
│   ├── fit-v6-calibration.ts      # 50/50 disjoint calibration under 3.5° angular noise
│   └── verify-v6-all.ts           # Single-command 8-step verification suite
├── src/                           # Primary Next.js 16 + TypeScript web application
│   ├── app/                       # App Router (pages, layout, and REST API endpoints)
│   ├── components/                # React UI components, interactive HUDs, and controllers
│   ├── config/                    # Central parameter registry (steadygate.config.ts)
│   ├── db/                        # Embedded PGlite / PostgreSQL schema and seed runners
│   ├── lib/                       # Perception, kinematics, signal processing, and policy
│   │   ├── biomechanics/          # Coupled IK, JointSpaceCKF, and ROM normalization
│   │   ├── hardware/              # HMAC-SHA256 LAN bridge and circuit breaker
│   │   ├── locales/               # Regional taboo gesture remapping
│   │   ├── policy/                # Intentionality gate, safety chords, and air-dial
│   │   ├── vision/                # Live skin chromaticity calibration
│   │   └── voter/                 # Time-weighted exponential decay voter
│   └── types/                     # Clean, unified TypeScript type declarations
├── steadygate/                    # Python package for offline Digital Twin, chaos lab, and IoT
│   ├── actuator.py                # Virtual actuator with state separation
│   ├── chaos.py                   # Automated chaos injection matrix
│   ├── recorder.py                # JSONL Flight Recorder with privacy pixel-zeroing
│   └── twin.py                    # Standalone FastAPI + WebSocket Digital Twin (port 8765)
├── storage/                       # Local persistent state and stratified human benchmark datasets
├── tests/                         # Multi-language test suite (TypeScript and Python)
│   ├── gesture-robustness.test.ts # Real human HaGRID 500-sample benchmark
│   ├── adversarial-challenger-*.ts# Challenger 1 & 2 adversarial suites
│   ├── global-v4-adversarial.test.ts # Multi-seed end-to-end batteries G1-G11
│   └── test_phase*.py             # Python digital twin, recorder, and chaos tests
├── tools/                         # Specialized developer tooling
│   └── soak-replay.ts             # 62.5h clinical soak simulator across 5 pathological profiles
├── package.json                   # NPM package scripts and dependencies
├── pyproject.toml                 # Python package specification and pytest configuration
└── README.md                      # This file
```

---

## 3. Clinical Invariants & Verified Performance

SteadyGate simultaneously satisfies both **Safety** (zero false activations) and **Access** (maximum inclusivity) at the exact same operating threshold:

| Category | Clinical Specification | Measured Result in v6.0-FINAL | Evidence Source |
| :--- | :--- | :--- | :--- |
| **Soak Replay False Alarms** | $\le 0.05\text{ FA/hr}$ on multi-hour soak | **$0.0\text{ FA/hr}$** ($0 / 62.5\text{ h}$, Rule-of-3 upper 95% bound $\le 0.0480$) | [`docs/SOAK_REPORT.json`](./docs/SOAK_REPORT.json) |
| **Bare-Hand Safety** | $0$ false object blocks on bare hands | **$0 / 1,030$** ($95\%$ upper bound $0.00291$, Wilson lower bound $99.63\%$) | [`docs/VALIDATION_REPORT.md`](./docs/VALIDATION_REPORT.md) |
| **Intentionality Access** | $\ge 95\%$ first-attempt success across all profiles | **$100.0\%$** ($500 / 500$ trials across all 5 pathological profiles) | [`docs/SOAK_REPORT.json`](./docs/SOAK_REPORT.json) |
| **Activation Latency** | $T_{\text{act}}\text{ p95} \le 1.20\text{ s}$ | **$T_{\text{act}}\text{ p95} \le 0.08\text{ s}$** across all profiles | [`docs/SOAK_REPORT.json`](./docs/SOAK_REPORT.json) |
| **HaGRID Human Accuracy** | $\ge 98.0\%$ accuracy on stratified human hands | **$100.0\%$** on 500-sample real human benchmark | [`tests/gesture-robustness.test.ts`](./tests/gesture-robustness.test.ts) |
| **Tremor Attenuation** | $\ge 72\%$ RMS tremor reduction ($3.5\text{–}14.0\text{ Hz}$) | **$75.0\%\text{–}81.3\%$** attenuation under variable $\Delta t_k \in [15, 45]\text{ ms}$ | [`tests/global-v4-adversarial.test.ts`](./tests/global-v4-adversarial.test.ts) |
| **Voluntary Group Delay** | $\le 30.0\text{ ms}$ in $[0, 2.0\text{ Hz}]$ band | **$21.0\text{ ms}$** voluntary group delay | [`tests/global-v4-adversarial.test.ts`](./tests/global-v4-adversarial.test.ts) |
| **Held-Out CKF Coupling** | Held-out $\text{ROC AUC} \ge 0.95$ under $3.5^\circ$ noise | **$\text{ROC AUC} = 0.9542$** with automatic contracture exemption | [`scripts/fit-v6-calibration.ts`](./scripts/fit-v6-calibration.ts) |
| **Synchronous Frame Time** | $\le 7.70\text{ ms}$ internal budget at $p95$ | **$p50 = 0.409\text{ ms}, p95 = 0.888\text{ ms}$** | [`docs/CLAIMS_LEDGER.json`](./docs/CLAIMS_LEDGER.json) |

---

## 4. Quick Start Guide

### Prerequisites
* **Node.js**: `v20.x` or later
* **Python**: `3.10` or later (`py` on Windows / `python3` on Unix)
* **Webcam**: Standard 30 FPS USB / integrated camera

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/steadygate-prior-art-analysis.git
cd steadygate-prior-art-analysis

# Install Node.js dependencies
npm install

# Install Python package in editable mode with test dependencies
pip install -e ".[dev]"
```

### 2. Running the Application
```bash
# Start the unified Next.js web application (default port: 3000 or 3001)
npm run dev

# In a separate terminal, start the Python Digital Twin server (port 8765)
npm run twin
```

Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001`) in your browser to access the live camera stream, intentionality radar, and appliance control room.

---

## 5. Verification & Testing

SteadyGate enforces a single-command verification gate that executes all 8 sub-suites:

```bash
# Execute the complete 8-step production verification suite
npm test
```

### Sub-Suite Breakdown
| Command | Suite Description | Status |
| :--- | :--- | :--- |
| `npm run typecheck` | TypeScript Strict Compiler Check (`tsc --noEmit`) | 0 Errors |
| `npm run calibrate` | 50/50 Disjoint Out-of-Sample Calibration Audit | Held-out AUC = 0.9542 |
| `npm run test:gesture` | Real Human HaGRID 500-Sample Benchmark | 26 / 26 Passed |
| `npm run test:challenger:1` | Challenger 1 Adversarial Grasp & Vision Suite | 18 / 18 Passed |
| `npm run test:challenger:2` | Challenger 2 Tremor $f_0$ & Concurrency Suite | 70 / 70 Passed |
| `npm run test:global` | Global Adversarial Batteries G1–G11 (Seeds 42, 101, 2026) | 41 / 41 Passed |
| `npm run test:py` | Python Digital Twin, Recorder & Chaos Matrix | 26 / 26 Passed |
| `npm run test:soak` | Continuous 62.5h Clinical Soak Replay | 0 FA ($\le 0.048$ FA/hr) |

---

## 6. License & Regulatory Classification

SteadyGate is licensed under the [Apache License, Version 2.0](./LICENSE).

**Regulatory Classification:** Non-diagnostic assistive smart-home control software and general-wellness steadiness telemetry (Invariant I8). Conforms to HL7 FHIR R4 (`category="activity"`) and DPDP privacy guidelines with zero raw video pixel persistence.
