# SteadyGate Phase 5 — Independent Evidence Audit Report

> **Document:** `docs/PHASE5_EVIDENCE_AUDIT_REPORT.md`  
> **Status:** Formal Independent Evidence Audit  
> **Audit Type:** Read-Only Verification of Claims, Provenance, Independence & Metric Calculations  
> **Target:** SteadyGate Phase 5 Empirical Evaluation Artifacts (`src/lib/real-webcam-evaluator.ts`, `docs/reports/REAL_WEBCAM_EVALUATION_REPORT.json`, `docs/REAL_WEBCAM_VALIDATION_REPORT.md`)  
> **Audit Date:** November 20, 2026  
> **Monorepo Checkpoint Preserved:** `3cacd199` (`v6.0-prototype`)  
> **Safety & Regulatory Notice:** Read-only audit. No classifier thresholds, model parameters, or verification gates have been modified.

---

## Executive Summary & Audit Verdict

Following external review and scientific verification concerns regarding data provenance, session independence, optical robustness, and metric definitions, an exhaustive read-only evidence audit was conducted across the 436 evaluation samples and evaluation code.

### Summary of Audit Verdict:
1. **Provenance:** The 436-sample evaluation suite is an **offline hybrid benchmark**, **NOT a live-webcam multi-session dataset**. Only $106/436$ ($24.3\%$) of samples originate from real human hands (100 static HaGRID photographs + 6 screenshot fixtures). The remaining $330/436$ ($75.7\%$) are mathematical synthetic simulations. $100$ synthetic samples (75 negative object grasps + 25 conversational idle) were inaccurately marked with `GENUINE_WEBCAM` provenance in metadata.
2. **Session Independence:** **Session independence was NOT demonstrated.** Enrolled profile $B_1$ was not acquired from a disjoint physical recording session; its centroids (`[0.35, 0.68, 0.68, 0.68, 0.68]`) are hardcoded constants specifically aligned with the synthetic contracture generator. The 50 contracture samples contain only 10 unique parameter variations repeated 5 times ($n=10$ effective).
3. **Environmental Robustness:** **Optical robustness under low light and glare is NOT established.** The evaluation applied mathematical coordinate noise and coordinate scaling to pre-extracted landmarks; the pixel-level vision pipeline (WebAssembly MediaPipe, CLAHE, gamma correction) was **never executed** on real degraded video frames.
4. **Metric Reconciliations:**
   - **Macro Precision ($0.975$):** Mathematically verified. $B_0$'s 50 contracture misclassifications were assigned to `FOUR_FINGERS` (an out-of-repertoire class), which reduced `OPEN_PALM` recall without generating false positives among the 5 command classes.
   - **First-Attempt Success ($S_1$):** **Invalid proxy.** $S_1$ is an interactive, multi-frame temporal event metric (dwell completion within 1.5s). Evaluating single static frames and checking CPU latency ($<500\text{ ms}$) does not measure temporal success. For static frame evaluations, $S_1$ is **N/A**.
   - **Negative Rejection:** $104/104$ rejection demonstrates geometric guard rule consistency on synthetic grasps, but does **not** establish a clinical hourly False Activation Rate ($\text{FAR/hour}$).

---

## 1. Dataset Provenance Breakdown

Detailed inspection of `src/lib/real-webcam-evaluator.ts` (`buildStandardHeldOutEvaluationSuite()`) reveals the true origin of all 436 samples:

| Sample Group | Count | Labeled Provenance | Actual Data Source | Real Human Hands? | Audit Assessment |
| :--- | :---: | :---: | :--- | :---: | :--- |
| **HaGRID Stratified Subset** | 100 | `GENUINE_WEBCAM` | Static single-frame landmark extracts from HaGRID dataset | **Yes** (Static) | Valid offline human data, but static photos, not temporal live webcam stream. |
| **Real Screenshot Fixtures** | 6 | `GENUINE_WEBCAM` | Landmark fixtures reconstructed from 6 live camera screenshots | **Yes** (Static) | Genuine single-frame live camera captures (`REAL_WORLD_FAILURE_CASES`). |
| **Negative Object Holds** | 75 | `GENUINE_WEBCAM` | `generateObjectGraspLandmarks()` mathematical generator | **No** (Synthetic) | ❌ **Mislabeled Provenance.** Procedurally generated landmark models. |
| **Conversational Idle Gestures** | 25 | `GENUINE_WEBCAM` | `generateSyntheticGestureLandmarks("UNKNOWN")` | **No** (Synthetic) | ❌ **Mislabeled Provenance.** Procedurally generated idle hand positions. |
| **Low-Light Sensor Jitter** | 50 | `SYNTHETIC_SIMULATION` | Synthetic landmarks + sinusoidal Gaussian coordinate noise ($\sigma=0.012$) | **No** (Synthetic) | Correctly labeled synthetic; tests landmark noise tolerance, not optics. |
| **Direct Glare Compression** | 50 | `SYNTHETIC_SIMULATION` | Synthetic landmarks + 0.94 coordinate span compression | **No** (Synthetic) | Correctly labeled synthetic; tests geometric tolerance, not optical blooming. |
| **Partial Occlusion / Edge-Crop** | 40 | `SYNTHETIC_SIMULATION` | Synthetic landmarks with thumb/pinky collapsed to palm center | **No** (Synthetic) | Correctly labeled synthetic. |
| **Arthritic Contracture ROM** | 50 | `SYNTHETIC_SIMULATION` | Synthetic OPEN_PALM deformed by `ext = 0.60..0.72` & thumb pull 0.85 | **No** (Synthetic) | Correctly labeled synthetic, but contains 40 exact duplicate frames. |
| **Parkinsonian Rest Tremor** | 40 | `SYNTHETIC_SIMULATION` | Synthetic landmarks + 5.2 Hz sinusoidal kinematic oscillation | **No** (Synthetic) | Correctly labeled synthetic. |
| **TOTAL** | **436** | — | **106 Human / 330 Synthetic** | **24.3% Human** | **Suite is 75.7% Synthetic Simulation.** |

---

## 2. Session Independence Audit

### 2.1 Training vs. Evaluation Coupling
In `src/lib/real-webcam-evaluator.ts` (lines 525–540):
```typescript
this.enrolledProfile = {
  id: "eval_enrolled_p01",
  name: "Arthur Pendelton (Enrolled)",
  personalizedPrototypes: JSON.stringify({
    OPEN_PALM: { centroid: [0.35, 0.68, 0.68, 0.68, 0.68], confidenceBoost: 1.20, flexTol: 0.28 },
    ...
  }),
};
```
- The enrolled parameters are **hardcoded literals** in the test runner constructor.
- The contracture test sample generator (`src/lib/real-webcam-evaluator.ts`, lines 415–435) generates finger extensions between `0.60` and `0.72` (mean `0.66`) and pulls the thumb to `0.35`.
- **Finding:** The "enrolled" profile did not originate from a participant calibration session ($T_0$). It is an engineered parameter set hardcoded to match the exact mathematical bounds of the synthetic contracture generator.

### 2.2 Duplicate Sample Redundancy
Inspection of the 50 contracture samples (`scripts/audit-duplicates.ts`):
```typescript
const ext = 0.60 + (i % 10) * 0.012; // Evaluated at i = 0..49
```
- Only 10 distinct extension values exist: `[0.600, 0.612, 0.624, 0.636, 0.648, 0.660, 0.672, 0.684, 0.696, 0.708]`.
- Each extension value is evaluated **5 times with identical timestamp 0**.
- **Finding:** 40 out of 50 contracture samples are exact geometric duplicates. The effective sample size for contracture evaluation is **$n=10$**, not $n=50$.

---

## 3. Confusion Matrices & Metric Reconciliations

### 3.1 Recomputed Confusion Matrices (Identical 436 Samples)

#### Model $B_0$ Baseline (Canonical HaGRID):
```
Actual \ Predicted | FIST | OPEN_PALM | VICTORY | POINT_UP | THUMBS_UP | FOUR_FINGERS | 3_FINGERS | UNKNOWN (NONE)
-------------------+------+-----------+---------+----------+-----------+--------------+-----------+---------------
FIST (57)          |  57  |     0     |    0    |    0     |     0     |      0       |     0     |       0
OPEN_PALM (107)    |   0  |    49     |    0    |    0     |     0     |     50       |     8     |       0
VICTORY (56)       |   0  |     0     |   56    |    0     |     0     |      0       |     0     |       0
POINTING_UP (56)   |   0  |     0     |    0    |   56     |     0     |      0       |     0     |       0
THUMBS_UP (56)     |   8  |     0     |    0    |    0     |    48     |      0       |     0     |       0
NONE (104)         |   0  |     0     |    0    |    0     |     0     |      0       |     0     |     104
```

#### Model $B_1$ Enrolled (Personalized Contracture Centroid):
```
Actual \ Predicted | FIST | OPEN_PALM | VICTORY | POINT_UP | THUMBS_UP | FOUR_FINGERS | 3_FINGERS | UNKNOWN (NONE)
-------------------+------+-----------+---------+----------+-----------+--------------+-----------+---------------
FIST (57)          |  57  |     0     |    0    |    0     |     0     |      0       |     0     |       0
OPEN_PALM (107)    |   0  |    99     |    0    |    0     |     0     |      0       |     8     |       0
VICTORY (56)       |   0  |     0     |   56    |    0     |     0     |      0       |     0     |       0
POINTING_UP (56)   |   0  |     0     |    0    |   56     |     0     |      0       |     0     |       0
THUMBS_UP (56)     |   8  |     0     |    0    |    0     |    48     |      0       |     0     |       0
NONE (104)         |   0  |     0     |    0    |    0     |     0     |      0       |     0     |     104
```

### 3.2 Reconciliation of Reported Macro Precision ($0.975$)
- In $B_0$, all 50 contracture `OPEN_PALM` frames were predicted as `FOUR_FINGERS`.
- Because `FOUR_FINGERS` is not one of the 5 evaluated command gestures (`OPEN_PALM`, `FIST`, `VICTORY`, `POINTING_UP`, `THUMBS_UP`), this error counted as a **False Negative** for `OPEN_PALM`, but **not** as a False Positive for any evaluated command class.
- Across both models:
  - $\text{Precision}_{\text{OPEN\_PALM}} = \frac{49}{49 + 0} = 1.000$ (in $B_0$) and $\frac{99}{99 + 0} = 1.000$ (in $B_1$).
  - $\text{Precision}_{\text{FIST}} = \frac{57}{57 + 8} = 0.877$ (in both $B_0$ and $B_1$, due to 8 occluded thumbs-up poses).
  - $\text{Precision}_{\text{VICTORY}} = 1.000$, $\text{Precision}_{\text{POINTING\_UP}} = 1.000$, $\text{Precision}_{\text{THUMBS\_UP}} = 1.000$.
- **Macro Precision** is $(1.000 + 0.877 + 1.000 + 1.000 + 1.000) / 5 = \mathbf{0.975}$ for **both** models.
- **Finding:** The identical precision is mathematically correct within the closed 5-class evaluation subset, but the previous report omitted the confusion matrix explanation that $B_0$'s errors leaked into `FOUR_FINGERS`.

### 3.3 Event Metric Reclassification (First-Attempt Success)
- In the previous report, First-Attempt Success ($S_1$) was reported as $80.1\%$ ($B_0$) vs. $95.2\%$ ($B_1$), defined as `latencyMs < 500 && correct`.
- Because single-frame CPU inference took $\approx 0.03\text{ ms}$, **every** correctly predicted static frame was classified as a "first attempt success".
- **Finding:** True $S_1$ requires interactive, continuous multi-frame dwell time series data ($30\text{ FPS}$ stream over $1.5\text{ s}$). For this static frame benchmark, $S_1$ is scientifically invalid and must be classified as **N/A**.

---

## 4. Environmental & Vision Pipeline Audit

The previous report claimed:
> *"Low-light ($< 40\text{ lux}$) F1 = 1.000 (automatic CLAHE gain compensation); Harsh Glare ($> 800\text{ lux}$) F1 = 1.000 (dynamic gamma compression)."*

### Evidence Findings:
1. `src/lib/real-webcam-evaluator.ts` feeds landmark arrays directly into `classifyHandGesture(landmarks)`.
2. The browser WebAssembly MediaPipe vision runtime (`LiveCameraStream.tsx`), CLAHE kernel (`skin-calibrator.ts`), and optical gamma preprocessor were **never invoked**.
3. The "low-light" samples were created by taking synthetic coordinates and adding a math sine formula: `p.x + Math.sin(...) * 0.012`.
4. The "glare" samples were created by scaling coordinates by $0.94$.
5. **Verdict:** The test proves that the geometric rule engine tolerates coordinate jitter of $\sigma = 0.012$. It provides **zero evidence** that CLAHE or gamma algorithms successfully recover lost landmarks from dark or overexposed camera sensors.

---

## 5. Adaptive Model State ($B_2$ Admin) Audit

In the previous report, Model $B_2$ (Admin-Trained) was reported with metrics identical to $B_0$.
- Inspection of `storage/admin_trained_model.json` shows:
  - `totalSamplesTrained: 17213` (HaGRID base)
  - `gesturePrototypes: {}` (0 active prototypes)
  - `negativeGraspSignatures: []` (0 negative signatures)
- **Verdict:** Model $B_2$ is identical to Model $B_0$. No admin training adaptation was active in this evaluation.

---

## 6. Supported vs. Unsupported Claims Matrix

| Claim in Prior Report | Audited Verdict | Audit Evidence / Reason |
| :--- | :---: | :--- |
| **"Empirical real-webcam validation"** | ❌ **UNSUPPORTED** | $330/436$ ($75.7\%$) of samples are synthetic; only 106 derive from static photos. |
| **"Independent session evaluation ($T_0$ vs $T_0 + \Delta T$)"** | ❌ **UNSUPPORTED** | Centroids were hardcoded literals, not enrolled across real time-separated sessions. |
| **"Optical CLAHE and gamma robustness demonstrated"** | ❌ **UNSUPPORTED** | Pixel vision pipeline bypassed; tested only synthetic coordinate noise. |
| **"First-attempt success rate: $95.2\%$"** | ❌ **UNSUPPORTED** | Evaluated on static single frames; event-level dwell metric is **N/A**. |
| **"Hourly false activation rate is 0.0%"** | ❌ **UNSUPPORTED** | 104 static negative frames cannot establish temporal false activations per hour. |
| **"Personalized centroids solve contracture ceiling in offline benchmark"** | ✅ **SUPPORTED** | $B_1$ centroid successfully classifies the synthetic contracture kinematics ($50/50$). |
| **"Macro precision of $0.975$ is identical across $B_0$ and $B_1$"** | ✅ **SUPPORTED** | Verified by confusion matrix (misclassifications went to out-of-repertoire `FOUR_FINGERS`). |
| **"100 HaGRID samples are genuine human hand data"** | ✅ **SUPPORTED** | Extracted from the published HaGRID research dataset. |
| **"Internal algorithmic latency is $< 0.1\text{ ms}$"** | ✅ **SUPPORTED** | Pure CPU feature extraction and geometric scoring executes in $0.02\text{--}0.04\text{ ms}$. |

---

## 7. Concrete Next Steps: Roadmap to Genuine Real-Webcam Validation

To elevate SteadyGate from an **offline mathematical benchmark** to a **scientifically validated real-webcam system**, the following sequential roadmap must be executed:

```
┌────────────────────────────────────────────────────────┐
│ PHASE 5A: GENUINE DATASET COLLECTION (Webcam Stream)   │
│  1. Use browser webcam recording interface             │
│  2. Collect 21-landmark time-series at 30 FPS          │
│  3. Multi-frame dwell recordings (1.5s per gesture)    │
│  4. Save raw landmark JSONL with true provenance       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ PHASE 5B: DISJOINT ENROLMENT & EVALUATION PROTOCOL     │
│  1. Session 1 (T0): Guided 60s live calibration        │
│  2. Compute personalized centroid vector from stream   │
│  3. Persist profile to storage/users_personalized.json │
│  4. Mandatory 15+ min break (move camera, change light)│
│  5. Session 2 (T0 + ΔT): Independent test evaluation   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ PHASE 5C: REAL-WORLD OPTICAL STRESS AUDIT              │
│  1. Physical lux measurement (<40 lx lamp / glare)     │
│  2. Run camera frames through MediaPipe WASM + CLAHE   │
│  3. Measure landmark detection confidence dropouts     │
│  4. Test Stage 4 BMFLC-Kalman recovery from dropouts   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ PHASE 5D: TEMPORAL METRICS RECONCILIATION              │
│  1. Measure true First-Attempt Success (dwell complete)│
│  2. Continuous 60-minute conversational soak test      │
│  3. Measure actual False Activations Per Hour (FA/hr)  │
└────────────────────────────────────────────────────────┘
```

---

## 8. Reproducible Verification Commands

All audit findings can be independently reproduced using the read-only audit scripts in `scripts/`:

```bash
# 1. Verify exact dataset provenance (HaGRID vs synthetic vs mislabeled)
npx tsx scripts/audit-provenance-detailed.ts

# 2. Verify hardcoded centroids & duplicate contracture samples
npx tsx scripts/audit-independence.ts
npx tsx scripts/audit-duplicates.ts

# 3. Verify confusion matrices & precision reconciliation
npx tsx scripts/audit-metrics.ts

# 4. Verify environmental landmark noise (CLAHE/gamma bypass)
npx tsx scripts/audit-environmental.ts

# 5. Verify admin model state (0 trained prototypes)
npx tsx scripts/audit-admin.ts

# 6. Run full repository verification gate (must remain 100% green)
npm test
```
