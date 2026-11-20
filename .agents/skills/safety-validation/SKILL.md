---
name: safety-validation
description: Activate when testing false activations, verifying safety invariants, privacy audits, soak replay tests, adversarial benchmarks, or executing rollback procedures.
---

# Safety Validation, Invariant Verification & Clinical Soak Testing Skill

## Overview
Because SteadyGate actuates physical smart-home hardware (heaters, deadbolts, lights, fans) for individuals with involuntary movement disorders, **Safety Invariants are absolute and non-negotiable**. A false activation could trigger dangerous appliances or lock doors unintentionally.

This skill details the validation protocols, adversarial benchmarks, safety invariants, and the full 8-step verification gate.

---

## 1. Absolute Clinical Safety Invariants

| Invariant ID | Target | Requirement | Production Evidence Target |
|---|---|---|---|
| **I1: False Alarm Rate** | $\le 0.05\text{ FA/hr}$ | Continuous clinical soak replay | **$0.0\text{ FA/hr}$** ($0 / 62.5\text{ h}$, 95% bound $\le 0.0480$) |
| **I2: Bare-Hand Safety** | $0$ false blocks | Bare hands must never be blocked as objects | **$0 / 1,030$** false object blocks |
| **I3: Access Inclusivity** | $\ge 95.0\%$ | 1st-attempt intentional success across all 5 profiles | **$100.0\%$** ($500 / 500$ trials) |
| **I4: Activation Latency** | $p95 \le 1.20\text{ s}$ | Time from intent to commit | **$p95 \le 0.08\text{ s}$** |
| **I5: Human Accuracy** | $\ge 98.0\%$ | Real human HaGRID stratified benchmark | **$100.0\%$** on 500-sample benchmark |
| **I6: Tremor Attenuation**| $\ge 72.0\%$ | RMS reduction in $3.5\text{–}14.0\text{ Hz}$ band | **$75.0\%\text{–}81.3\%$** attenuation |
| **I7: Voluntary Delay** | $\le 30.0\text{ ms}$ | Group delay in $[0, 2.0\text{ Hz}]$ band | **$21.0\text{ ms}$** |
| **I8: Privacy Invariant** | Zero storage | Zero persistent raw video or face pixels | HL7 FHIR R4 & DPDP verified |

---

## 2. The 8-Step Flagship Verification Gate

The flagship gate enforces the sequential execution of 8 comprehensive sub-suites. **Never skip steps.**

```bash
# Execute the complete 8-step production verification suite
npm test
```

### Sub-Suite Command Reference:
```bash
# Step 1: Strict TypeScript Type Check
npm run typecheck

# Step 2: 50/50 Disjoint Calibration Audit
npm run calibrate

# Step 3: HaGRID 500-Sample Benchmark
npm run test:gesture

# Step 4: Challenger 1 Adversarial Suite (18 checks: grasp, occlusions, aids)
npm run test:challenger:1

# Step 5: Challenger 2 Tremor Suite (70 checks: f0 drift, multi-harmonic, LID)
npm run test:challenger:2

# Step 6: Global Adversarial Batteries G1–G11 (41 checks across seeds 42, 101, 2026)
npm run test:global

# Step 7: Python Digital Twin, NonceCache & Chaos Pytest Suite (47 tests)
npm run test:py

# Step 8: Continuous 62.5-Hour Clinical Soak Replay
npm run test:soak
```

---

## 3. Adversarial Attack & Stress Vectors

### Challenger 1 (`tests/adversarial-challenger-1.ts`)
- Tests bare hand vs object grasp (canes, mugs, bottles, remotes).
- Evaluates assistive aid invariance (compression gloves, wrist braces, walker bars).
- Rapid lighting strobes ($10\text{ Hz}\text{–}60\text{ Hz}$) and camera lens flare.

### Challenger 2 (`tests/adversarial-challenger-2.test.ts`)
- Variable frequency sweeps ($3\text{ Hz} \to 12\text{ Hz}$ over $5\text{ s}$).
- Dual-frequency modulation: Parkinsonian tremor ($5\text{ Hz}$) compounded with head titubation ($6\text{ Hz}$).
- High-amplitude dyskinesia bursts ($1.5\text{ Hz}$, $40\text{ mm}$ displacement).

### Global Batteries G1–G11 (`tests/global-v4-adversarial.test.ts`)
- Multi-seed end-to-end stress tests evaluating concurrent gesture noise, packet jitter ($\Delta t_k \in [15, 45]\text{ ms}$), camera dropouts, and sudden illumination cutoffs.

---

## 4. Hardware Safety, Circuit Breakers & Rollback

### High-Amperage Thermal Interlock (`src/config/steadygate.config.ts`)
- High-amperage appliances (e.g., $9.1\text{ A}$ Quartz Radiant Heater) require:
  - `UNATTENDED_HOME_MODE`: Gesture-ON is strictly forbidden (`TX_PROHIBITED`).
  - Gesture-OFF is always permitted instantly ($0\text{ ms}$ cutoff).
  - Maximum operational runtime cap ($1,800\text{ s}$).

### LAN Bridge Replay & Breaker Validation
- Every outbound command must carry HMAC-SHA256 headers:
  `X-SteadyGate-Signature`, `X-SteadyGate-Nonce`, `X-SteadyGate-Timestamp`
- Replay verification: Submitting an identical nonce within $10\text{ seconds}$ must return `401 Unauthorized`.
- Hardware circuit breaker: If 3 consecutive RPC requests fail or timeout, the bridge must enter `CIRCUIT_TRIPPED` lockout mode.

### Rollback Protocol
If any safety invariant is violated during a pull request or refactoring:
1. Immediately revert candidate changes: `git restore <file>`
2. Check `docs/VALIDATION_REPORT.md` and `SOLUTIONS.md` for known regression fixes.
3. Re-run `npm test` to confirm clean baseline state before re-attempting.
