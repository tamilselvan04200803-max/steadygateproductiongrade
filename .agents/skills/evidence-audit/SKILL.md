---
name: evidence-audit
description: Activate when conducting independent evidence audits, verifying dataset provenance, checking session independence, recomputing confusion matrices, detecting duplicate samples, or auditing optical claims.
---

# Independent Evidence Audit, Provenance Verification & Metric Reconciliation Skill

## Overview
This skill provides guidelines and tools for conducting **read-only, scientific evidence audits** on SteadyGate benchmarks. It ensures that published accuracy numbers, adaptive improvements, and safety metrics are supported by verifiable, reproducible source evidence.

---

## 1. Core Audit Methodology

### 1.1 Dataset Provenance Audit
Verify the true physical origin of every sample in the evaluation suite:
- **HaGRID-derived samples:** Extracted from published static research photographs (valid human hand geometry, but static, not live temporal stream).
- **Real screenshot fixtures:** Extracted from historical live camera frames (`REAL_WORLD_FAILURE_CASES`).
- **Synthetic mathematical generators:** Check if samples were generated via functions like `generateSyntheticGestureLandmarks()` or `generateObjectGraspLandmarks()`.
- **Integrity Rule:** Procedural or mathematical samples must **never** be labeled `GENUINE_WEBCAM`.

### 1.2 Session Independence Audit
Verify that enrolled models ($B_1$) and evaluation sets are truly disjoint:
1. Inspect the enrolled profile initialization. If centroids are hardcoded literals (e.g. `[0.35, 0.68, 0.68, 0.68, 0.68]`), flag as **engineered parameter matching**, not live enrollment.
2. Check for duplicate samples: hash landmark coordinate tuples `(x, y, z)` across all frames. If identical frames are evaluated multiple times, compute the **effective sample size ($n$)**.
3. Cryptographic Separation: Ensure 0 frame overlap between enrollment ($T_0$) and independent evaluation ($T_0 + \Delta T$).

### 1.3 Full Confusion Matrix & Metric Reconciliation
1. Never rely solely on scalar summary metrics (Accuracy, Macro F1).
2. Generate the **complete confusion matrix** across all possible predicted classes (including out-of-repertoire gestures like `FOUR_FINGERS`, `THREE_FINGERS`, `UNKNOWN`).
3. Reconcile precision paradoxes: if Macro Precision is identical despite large recall differences, check if the errors were classified as an out-of-repertoire class (which drops recall without penalizing command precision).
4. Reclassify event-level metrics:
   - **First-Attempt Success ($S_1$):** Mark as **N/A** for static frame datasets. $S_1$ is an interactive dwell metric (requires multi-frame hold within 1.5s).
   - **Hourly False Activation Rate:** Mark as **N/A** for static frames. $\text{FA/hr}$ requires continuous temporal observation over hours.

### 1.4 Optical & Vision Pipeline Audit
Check whether environmental robustness claims (low light, glare, occlusion) were tested on raw camera pixels:
- Did the test process raw image bitmaps through `MediaPipe`, `skin-calibrator.ts` (CLAHE), and dynamic gamma?
- Or did the test simply add coordinate noise ($\sigma=0.012$) to pre-extracted landmarks?
- If the pixel pipeline was not executed, **do not attribute improvements to CLAHE or gamma correction**.

---

## 2. Audit Command Suite

Run the read-only audit scripts to inspect benchmark claims:

```bash
# 1. Inspect exact sample provenance (HaGRID vs synthetic vs mislabeled)
npx tsx scripts/audit-provenance-detailed.ts

# 2. Check for hardcoded enrolled centroids & session coupling
npx tsx scripts/audit-independence.ts

# 3. Detect duplicate frames and compute effective sample size (n)
npx tsx scripts/audit-duplicates.ts

# 4. Recompute full confusion matrices and verify precision/recall
npx tsx scripts/audit-metrics.ts

# 5. Verify whether environmental tests exercised CLAHE/gamma or landmark noise
npx tsx scripts/audit-environmental.ts

# 6. Verify admin model state (active prototypes & negative signatures)
npx tsx scripts/audit-admin.ts

# 7. Verify baseline repository health
npm test
```
