---
name: real-webcam-validation
description: Activate when conducting real-webcam evaluations, empirical benchmark runs, disjoint session testing, model triad comparisons (B0 vs B1 vs B2), and landmark-only dataset persistence.
---

# Real-Webcam Validation, Disjoint Session Protocol & Triad Evaluation Skill

## Overview
SteadyGate evaluates adaptive gesture recognition across three classifier configurations on identical held-out landmark inputs:
1. **Baseline ($B_0$):** Canonical geometric rules calibrated on the 17,213-sample HaGRID dataset.
2. **Enrolled ($B_1$):** Individualized user profile containing resting flexion centroids, passive ROM scaling, and individualized tremor notch filtering ($f_0$).
3. **Admin-Trained ($B_2$):** Prototype centroids adjusted with negative object-grasp signatures and negative training samples.

This skill governs the execution, session independence, privacy guarantees, and safety invariants of real-webcam evaluations.

---

## 1. Absolute Privacy & Safety Invariants

| Invariant | Requirement | Verification Method |
|---|---|---|
| **Zero Raw Video Egress** | Raw camera pixels and image bitmaps must **never** be saved to disk or transmitted over APIs. | DPDP & HL7 FHIR compliance. Inspect `/api/webcam-eval` payload validation. Only 21 normalized landmarks (`Float32Array[21 * 2/3]`) permitted. |
| **Candidate Actuation Isolation** | Candidate models ($B_1, B_2$) evaluate in shadow memory and **must not actuate physical hardware** unless explicitly validated and promoted. | Verify shadow mode gating in `src/app/api/actuate/route.ts` and `src/lib/shadow-mode.ts`. |
| **Strict Freeze Mandate** | Zero classifier threshold adjustments, tuning, or prototype re-weighting using evaluation samples. | Threshold definitions remain locked during evaluation. |
| **Accurate Provenance Tagging** | Datasets must never mislabel synthetic or procedurally generated samples as `GENUINE_WEBCAM`. | Verify provenance breakdown: distinguish `GENUINE_WEBCAM`, `SYNTHETIC_SIMULATION`, and `OFFLINE_HYBRID_BENCHMARK`. |

---

## 2. Disjoint Session Protocol ($T_0$ vs. $T_0 + \Delta T$)

To prevent overfitting and test leakage, real-participant evaluations **must** follow the two-session protocol:

```
┌──────────────────────────────────────────────────────────┐
│ SESSION 1: ENROLMENT & CALIBRATION (Time T0)             │
│  - 60s guided resting tremor & baseline hand capture    │
│  - Generation of personalized prototype centroid vector  │
│  - Lock profile into storage/users_personalized.json     │
└────────────────────────────┬─────────────────────────────┘
                             │
            [ Mandatory 15+ Min Interval / Reset ]
            [ Camera re-positioned, ambient light shift ]
                             │
┌────────────────────────────▼─────────────────────────────┐
│ SESSION 2: INDEPENDENT EVALUATION (Time T0 + ΔT)         │
│  - Strict freeze: zero threshold tuning permitted        │
│  - Evaluate B0, B1, and B2 on identical held-out inputs  │
│  - Cryptographic check: 0 frame overlap between T0 & T0+Δ│
│  - Log results to isolated evaluation ledger             │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Evaluation Commands & Toolchain

```bash
# 1. Run the headless triad evaluation suite (generates REAL_WEBCAM_EVALUATION_REPORT.json)
npm run test:webcam-eval

# 2. Run the full 8-step production verification gate
npm test

# 3. TypeScript strict compiler check
npm run typecheck

# 4. ESLint verification
npm run lint

# 5. Start web app to view Diagnostics evaluation card
npm run dev:3001
# Navigate to http://localhost:3001 and select the "DIAGNOSTICS" tab
```

---

## 4. Evaluator Architecture (`src/lib/real-webcam-evaluator.ts`)

- **Input:** Sequence of `EvaluationSample` objects (21 normalized landmarks, target gesture, lighting, visibility, kinematics, provenance).
- **Execution:** Every sample is passed to $B_0$, $B_1$, and $B_2$ on the **exact same landmark coordinates**.
- **Metrics Computed:**
  - Macro & Per-Class Precision, Recall, and F1 across the 5 command gestures (`OPEN_PALM`, `FIST`, `VICTORY`, `POINTING_UP`, `THUMBS_UP`) and `NONE`.
  - Unintended Activation Rate (FAR on `NONE` and negative object holds).
  - Missed Command Rate (FNR on command gestures).
  - Median internal CPU classification latency (ms).
  - Environmental Stress Matrix breakdown (by lighting, visibility, and biomechanics).
- **Static vs. Temporal Event Distinction:** For static single-frame benchmarks, First-Attempt Success ($S_1$) must be marked **N/A**; true $S_1$ requires interactive multi-frame dwell confirmation.
