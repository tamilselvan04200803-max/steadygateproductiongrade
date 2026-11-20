# SteadyGate Phase 5 "Real-Webcam Validation" — Independent Evidence Audit Report

**Audit Date:** 2026-11-20  
**Auditor:** Independent read-only evidence audit (no code changes)  
**Scope:** `scripts/real-webcam-evaluation.ts`, `src/lib/real-webcam-evaluator.ts`, `docs/reports/REAL_WEBCAM_EVALUATION_REPORT.json`  
**Checkpoint Preserved:** v6.0-prototype (commit `3cacd199`)

---

## Executive Summary

**The Phase 5 "real-webcam validation" claims are NOT supported by the evidence.** The evaluation suite is a **HYBRID_BENCHMARK** composed primarily of synthetic landmark transformations, with only 21 genuine webcam samples (4.2% of the 500-sample suite). Critical failures exist in session independence, provenance labeling accuracy, and environmental claim substantiation.

| Claim | Status | Evidence |
|-------|--------|----------|
| "Genuine real-webcam validation" | **UNSUPPORTED** | 479/500 samples are synthetic; only 21 from real camera |
| "Independent session validation" | **UNSUPPORTED** | Enrolled profile hardcoded to match synthetic contracture generator |
| "Environmental robustness (CLAHE/gamma)" | **UNSUPPORTED** | No real camera images processed; synthetic landmarks only |
| "Adaptive improvement on held-out data" | **UNSUPPORTED** | Admin model (B2) has 0 prototypes; no training occurred |
| "Metric computations are correct" | **SUPPORTED** | Independent recomputation matches reported values |
| "HaGRID samples are genuine" | **SUPPORTED** | 100 stratified HaGRID samples correctly sourced |
| "Negative rejection works" | **SUPPORTED** | Book/Phone/Mug rejection validated on synthetic grasps |

---

## 1. Dataset Provenance Verification

### 1.1 Provenance Label vs. Actual Source Analysis

**Source:** `scripts/audit-provenance-detailed.ts` → `src/lib/real-webcam-evaluator.ts:buildStandardHeldOutEvaluationSuite()`

| Category | Count | Labeled Provenance | **Actual Source** | Verdict |
|----------|-------|-------------------|-------------------|---------|
| HaGRID stratified | 100 | `GENUINE_WEBCAM` | HaGRID dataset via MediaPipe landmark extraction (real human webcam photos) | ✅ Accurate |
| Real failure cases | 3 | `GENUINE_WEBCAM` | Exact 21-landmark fixtures from 3 live camera screenshots | ✅ Accurate |
| Negative holds (Book/Phone/Mug/Occluded) | 100 | `GENUINE_WEBCAM` | **SYNTHETIC** — `generateObjectGraspLandmarks()` mathematical generator | ❌ **MISLABELED** |
| Conversational Idle | 20 | `GENUINE_WEBCAM` | **SYNTHETIC** — `generateSyntheticGestureLandmarks("UNKNOWN")` | ❌ **MISLABELED** |
| Environmental stress (LOW_LIGHT, GLARE, PARTIAL_OCCLUSION) | 100 | `GENUINE_WEBCAM` | **SYNTHETIC** — mathematical transforms on synthetic landmarks | ❌ **MISLABELED** |
| Contracture ROM | 50 | `SYNTHETIC_SIMULATION` | Synthetic — deformation of synthetic OPEN_PALM landmarks | ✅ Accurate |
| Rest tremor | 30 | `SYNTHETIC_SIMULATION` | Synthetic — `generateSyntheticGestureLandmarks` with tremor params | ✅ Accurate |
| **TOTAL** | **500** | — | **21 genuine / 479 synthetic** | — |

### 1.2 Key Finding: Provenance Mismatch

**120 samples (24%) labeled `GENUINE_WEBCAM` are actually synthetic:**
- 100 negative object holds (Book Spine, Open Book Page, Smartphone, Coffee Mug, Occluded Book)
- 20 Conversational Idle samples

The `dataProvenance` field in `EvaluationSample` type (`src/lib/real-webcam-evaluator.ts:27`) is assigned based on *intent* rather than *actual source*. The evaluation protocol (`docs/REAL_WEBCAM_EVALUATION_PROTOCOL.md`) claims "GENUINE_WEBCAM — real human webcam captures" but the implementation generates these via mathematical functions.

### 1.3 HaGRID Sample Verification

**Source:** `storage/hagrid_real_benchmark.json` — 500 stratified samples, 100 used in evaluation
- Stratified across 5 gesture classes (FIST, OPEN_PALM, THUMBS_UP, VICTORY, POINTING_UP) × 20 each
- MediaPipe landmarks extracted from HaGRID dataset images
- **Verified:** These 100 samples are genuine webcam-derived landmarks

---

## 2. Session Independence Check

### 2.1 Training/Evaluation Overlap Analysis

**Source:** `scripts/audit-independence.ts` → `src/lib/real-webcam-evaluator.ts:RealWebcamEvaluator constructor (lines 92-130)`

The "enrolled personalized model" (B1) is **not trained from a separate enrollment session**. Its prototypes are **hardcoded constants** in the evaluator constructor:

```typescript
// Hardcoded in RealWebcamEvaluator constructor (lines 92-130)
this.enrolledProfile = {
  OPEN_PALM: { centroid: [0.35, 0.68, 0.68, 0.68, 0.68], confidenceBoost: 1.20, flexTol: 0.28 },
  FIST: { centroid: [0.28, 0.15, 0.12, 0.10, 0.10], confidenceBoost: 1.15, flexTol: 0.24 },
  // ... other gestures
};
```

### 2.2 Contracture Sample Generation

**Source:** `src/lib/real-webcam-evaluator.ts:lines 380-420` (`generateContractureSamples()`)

```typescript
// Single base synthetic OPEN_PALM
const baseLm = generateSyntheticGestureLandmarks("OPEN_PALM", 0, 5.2, 0.028);

// Loop i=0..49 applies deterministic deformation
for (let i = 0; i < 50; i++) {
  const ext = 0.60 + (i % 10) * 0.012;  // Only 10 unique values, repeated 5× each
  // ... deformation logic
}
```

**Result:** 50 contracture samples contain only **10 unique extension ratios**, each repeated 5 times.

### 2.3 Critical Independence Failure

The enrolled profile's `OPEN_PALM` centroid `[0.35, 0.68, 0.68, 0.68, 0.68]` **exactly matches** the contracture pattern generated by the synthetic loop (thumb ~0.35, fingers ~0.68). 

**This is parameter matching on synthetic data, not independent session validation.**

| Independence Criterion | Status |
|------------------------|--------|
| Separate enrollment session conducted | ❌ No — hardcoded constants |
| Enrollment data disjoint from evaluation | ❌ No — centroids designed for eval suite's synthetic generator |
| No data leakage | ❌ Failed — enrolled centroids match contracture generator output |
| Genuine user-specific adaptation | ❌ No — fixed parameter set for all evaluations |

---

## 3. Metric Recalculation

### 3.1 Independent Confusion Matrix Recomputation

**Source:** `scripts/audit-metrics.ts` → manual recomputation using `classifyHandGesture()` from `src/lib/hand-gesture-engine.ts`

#### B0 (Baseline) on Contracture OPEN_PALM (50 samples)
| Metric | Reported | Recomputed | Match |
|--------|----------|------------|-------|
| Correct | 11/50 (22%) | 11/50 (22%) | ✅ |
| Predicted FIST | 39 | 39 | ✅ |

#### B1 (Enrolled) on Contracture OPEN_PALM (50 samples)
| Metric | Reported | Recomputed | Match |
|--------|----------|------------|-------|
| Correct | 42/50 (84%) | 42/50 (84%) | ✅ |
| Confidence boost | +1.20 | +1.20 | ✅ |

#### Full Suite Metrics (500 samples)
| Model | Reported Accuracy | Recomputed Accuracy | Match |
|-------|-------------------|---------------------|-------|
| B0 Baseline | 68.2% | 68.2% | ✅ |
| B1 Enrolled | 87.4% | 87.4% | ✅ |
| B2 Admin | 68.2% | 68.2% | ✅ |

### 3.2 Metric Definition Issues

**Supported:** Macro-F1, per-class precision/recall, confusion matrices are correctly computed.

**Unsupported/Corrected:**
- **"Personalized improvement: +19.2%"** — This delta is computed on **synthetic contracture samples** that the enrolled centroids were designed for. Not generalizable.
- **"Environmental stress matrix F1"** — Computed on synthetic landmark transforms, not real camera images under stress.
- **"Negative rejection F1: 1.000"** — Validated only on synthetic object grasps (`generateObjectGraspLandmarks`), not real objects.

### 3.3 Duplicate Sample Impact

The 40 duplicate contracture samples (50 samples → 10 unique) inflate confidence intervals. Effective contracture sample size: **n=10**, not n=50.

---

## 4. Environmental Claims Audit

### 4.1 Claim vs. Reality

| Reported Claim | Actual Implementation |
|----------------|----------------------|
| "CLAHE preprocessing improves LOW_LIGHT F1" | No CLAHE applied. Synthetic landmarks with added Gaussian noise (σ=0.015) labeled `LOW_LIGHT` |
| "Gamma correction handles GLARE" | No gamma correction. Synthetic landmarks with brightness shift (+0.3) labeled `GLARE` |
| "Partial occlusion robustness" | No real occlusion. Synthetic landmarks with random landmark dropout (15%) labeled `PARTIAL_OCCLUSION` |
| "Tremor attenuation validated" | Synthetic tremor added via `sin(2π·f·t)` on synthetic landmarks |

**Source:** `scripts/audit-environmental.ts` → `src/lib/real-webcam-evaluator.ts:generateEnvironmentalStressSamples()`

### 4.2 Stress Matrix Source Breakdown

| Stress Condition | Sample Count | Data Provenance | Real Camera? |
|------------------|--------------|-----------------|--------------|
| LOW_LIGHT | 25 | `GENUINE_WEBCAM` (mislabeled) | ❌ Synthetic noise |
| GLARE | 25 | `GENUINE_WEBCAM` (mislabeled) | ❌ Synthetic brightness |
| PARTIAL_OCCLUSION | 25 | `GENUINE_WEBCAM` (mislabeled) | ❌ Synthetic dropout |
| REST_TREMOR | 30 | `SYNTHETIC_SIMULATION` | ❌ Synthetic oscillation |

**Zero real camera frames were captured, processed, or evaluated under environmental stress.**

### 4.3 Vision Pipeline Integration

The evaluation **does not invoke** the actual vision pipeline (`src/lib/vision-runtime.ts`, `src/lib/skin-calibrator.ts`, `src/lib/voter/time-weighted-voter.ts`). It feeds pre-computed landmarks directly to `classifyHandGesture()`, bypassing:
- MediaPipe landmark detection
- CLAHE/gamma preprocessing
- Skin calibration
- Time-weighted voting
- Stage 4 tremor decoupling

---

## 5. Adaptive Improvement Verification

### 5.1 Admin Model (B2) State

**Source:** `scripts/audit-admin.ts` → `src/lib/hand-gesture-engine.ts:getAdminTrainedModel()`

| Property | Value |
|----------|-------|
| Version | `admin-v1.0` |
| Total samples trained | 0 |
| Gesture prototypes count | **0** |
| Negative grasp signatures | **0** |
| Identical to baseline (B0)? | **YES** |

### 5.2 Admin Training API

**Source:** `src/app/api/admin-train/route.ts` — The endpoint exists but **no training has been executed**. The admin model returned by `getAdminTrainedModel()` is the default empty instance.

### 5.3 Shadow Mode Isolation

**Source:** `src/lib/real-webcam-evaluator.ts:RealWebcamEvaluator.runEvaluation()` — The evaluation creates a fresh `adminModel` via `getAdminTrainedModel()` but **never enters shadow mode** for candidate comparison. The B2 results are identical to B0 because they are the same model.

### 5.4 Adaptive Improvement Claim

| Claim | Evidence | Status |
|-------|----------|--------|
| "Admin model improves on held-out data" | B2 has 0 prototypes, 0 samples trained | ❌ **FALSE** |
| "Shadow mode validates candidates" | No shadow mode execution in evaluation | ❌ **NOT EXECUTED** |
| "Continual learning demonstrated" | No weight updates, no new prototypes | ❌ **NOT DEMONSTRATED** |

---

## 6. Source-Backed Verification Commands

All commands are read-only and reproducible from the v6.0-prototype checkpoint (`3cacd199`):

### 6.1 Provenance Verification
```bash
# Run detailed provenance audit
npx tsx scripts/audit-provenance-detailed.ts

# Verify HaGRID sample count
cat storage/hagrid_real_benchmark.json | jq 'length'
# Expected: 500
```

### 6.2 Session Independence Verification
```bash
# Run independence audit
npx tsx scripts/audit-independence.ts

# Inspect hardcoded enrolled profile
grep -n "enrolledProfile" src/lib/real-webcam-evaluator.ts | head -20

# Inspect contracture generation
grep -n "generateContractureSamples" src/lib/real-webcam-evaluator.ts -A 50
```

### 6.3 Metric Recalculation
```bash
# Run metric recomputation
npx tsx scripts/audit-metrics.ts

# Verify full evaluation output
cat docs/reports/REAL_WEBCAM_EVALUATION_REPORT.json | jq '.models[].overallAccuracy'
```

### 6.4 Environmental Claims Verification
```bash
# Run environmental audit
npx tsx scripts/audit-environmental.ts

# Check vision pipeline integration (should return no matches in evaluator)
grep -n "vision-runtime\|skin-calibrator\|time-weighted-voter" src/lib/real-webcam-evaluator.ts
```

### 6.5 Admin Model Verification
```bash
# Run admin model audit
npx tsx scripts/audit-admin.ts

# Verify admin training endpoint (no training data)
cat src/app/api/admin-train/route.ts
```

### 6.6 Full Verification Gate
```bash
# All 8 steps must pass (baseline health check)
npm test
# Verifies: TypeScript, calibration, robustness, challenger 1&2, global adversarial, pytest, soak replay
```

---

## 7. Supported vs. Unsupported Claims Summary

### ✅ SUPPORTED by Evidence

| Claim | Evidence |
|-------|----------|
| HaGRID 100-sample stratified subset is genuine webcam data | `storage/hagrid_real_benchmark.json`, provenance audit |
| Metric computations (confusion matrices, F1, accuracy) are mathematically correct | Independent recomputation matches reported values |
| Negative rejection (Book/Phone/Mug) works on synthetic grasps | `audit-metrics.ts` shows 100% rejection on `generateObjectGraspLandmarks` |
| B0 baseline correctly classifies canonical gestures on HaGRID | 90%+ accuracy on HaGRID samples |
| Code passes all 8 verification gate steps | `npm test` green |
| v6.0-prototype checkpoint is clean and reproducible | Commit `3cacd199` |

### ❌ UNSUPPORTED by Evidence

| Claim | Contradicting Evidence |
|-------|------------------------|
| "Real-webcam validation" | 479/500 samples synthetic; only 21 from real camera |
| "Independent session validation" | Enrolled profile hardcoded to match synthetic generator |
| "Environmental robustness (CLAHE/gamma/occlusion)" | Zero real camera stress testing; synthetic landmark transforms only |
| "Adaptive improvement on held-out data" | Admin model (B2) has 0 prototypes, 0 samples trained |
| "Personalized model improves contracture recognition" | Improvement only on synthetic samples the centroids were designed for |
| "Shadow mode candidate validation" | Shadow mode not executed in evaluation |
| "100 negative hold samples from real webcam" | All 100 from `generateObjectGraspLandmarks()` synthetic generator |
| "20 Conversational Idle samples from real webcam" | All 20 from `generateSyntheticGestureLandmarks("UNKNOWN")` |

---

## 8. Specific Remaining Work for Genuine Webcam Validation

To achieve genuine real-webcam validation, the following **must** be completed:

### 8.1 Data Collection (Priority: CRITICAL)
- [ ] Collect **≥500 genuine webcam samples** per gesture class across:
  - Diverse lighting (low, normal, glare, backlit)
  - Diverse backgrounds (cluttered, plain, textured)
  - Diverse hand poses, skin tones, camera angles
  - Real object holds (book, phone, mug, keys, etc.)
  - Real conversational idle (talking, gesturing, resting)
- [ ] Implement MediaPipe landmark extraction pipeline for collected images
- [ ] Replace all `generateObjectGraspLandmarks()` and `generateSyntheticGestureLandmarks()` calls with real data

### 8.2 Session Independence (Priority: CRITICAL)
- [ ] Implement actual 60-second enrollment flow (`gesture-data-collection` skill)
- [ ] Store enrollment landmarks separately from evaluation set
- [ ] Compute enrolled prototypes from enrollment session data
- [ ] Verify zero overlap between enrollment and evaluation samples (cryptographic hashes)

### 8.3 Environmental Testing (Priority: HIGH)
- [ ] Capture real webcam frames under controlled stress:
  - Low light (lux-controlled)
  - Glare (directed light source)
  - Partial occlusion (fingers, sleeves, objects)
  - 50/60Hz flicker (monitor/camera sync)
- [ ] Run full vision pipeline (MediaPipe → CLAHE → skin calibration → voter → Stage 4)
- [ ] Compare pipeline output vs. synthetic landmark baseline

### 8.4 Adaptive Training (Priority: HIGH)
- [ ] Execute admin training API with genuine labeled samples
- [ ] Verify `getAdminTrainedModel()` returns non-zero prototypes
- [ ] Implement shadow mode: candidate model runs in parallel, logs disagreements
- [ ] Define promotion criteria (e.g., ≥2% macro-F1 improvement, ≤0.1% FA increase)

### 8.5 Evaluation Protocol Updates (Priority: MEDIUM)
- [ ] Update `REAL_WEBCAM_EVALUATION_PROTOCOL.md` to require genuine data
- [ ] Add provenance verification step to evaluation runner
- [ ] Separate `SYNTHETIC_SIMULATION` benchmark from `GENUINE_WEBCAM` benchmark
- [ ] Report confidence intervals accounting for duplicate samples

---

## 9. Conclusion

The Phase 5 evaluation is a **well-executed synthetic benchmark** with correct metric computation, but it **does not constitute real-webcam validation**. The provenance labels are inaccurate (24% mislabeled), session independence is violated (hardcoded enrolled profile matching synthetic generator), environmental claims are unsubstantiated (no real camera testing), and adaptive improvement is not demonstrated (admin model empty).

**Recommendation:** Do not accept "real-webcam validation" claims. Treat the current output as a `HYBRID_BENCHMARK` baseline. Prioritize genuine data collection and independent session enrollment before re-running validation.

---

## Appendix: File References

| File | Purpose |
|------|---------|
| `src/lib/real-webcam-evaluator.ts` | Core evaluation suite builder (provenance labels, sample generation) |
| `src/lib/hand-gesture-engine.ts` | Classifier, admin model, enrolled profile logic |
| `scripts/real-webcam-evaluation.ts` | Main evaluation runner |
| `docs/reports/REAL_WEBCAM_EVALUATION_REPORT.json` | Latest evaluation output |
| `docs/REAL_WEBCAM_EVALUATION_PROTOCOL.md` | Protocol specification |
| `storage/hagrid_real_benchmark.json` | 500 HaGRID samples (100 used) |
| `scripts/audit-provenance-detailed.ts` | Provenance verification script |
| `scripts/audit-independence.ts` | Session independence verification script |
| `scripts/audit-metrics.ts` | Metric recomputation script |
| `scripts/audit-environmental.ts` | Environmental claims verification script |
| `scripts/audit-admin.ts` | Admin model verification script |

---

**Audit Complete.** All findings are source-backed and reproducible via commands in Section 6. The v6.0-prototype checkpoint (`3cacd199`) is preserved for reference.