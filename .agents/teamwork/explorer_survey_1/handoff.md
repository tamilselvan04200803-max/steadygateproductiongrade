# R1 Survey Handoff Report: Strict Object-Grasp & Book-Holding Guard Verification

## Summary
- **Target Requirement**: R1 (Strict Object-Grasp & Book-Holding Guard Verification)
- **Status**: Baseline passes 100% (Check 19: 0/200 false positives, 0.00% FP). All 200 synthetic evaluation frames across `BOOK_SPINE`, `OPEN_BOOK`, `PHONE_GRASP`, `CUP_MUG`, and `OCCLUDED_BOOK` are cleanly suppressed.
- **Key Architectural Findings**:
  1. **Guard Shadowing**: Generic `BOOK_OR_OBJECT_GRASP` (Guard 2) executes before specialized guards (`LUMBRICAL_BOOK_CLAMP`, `OPEN_BOOK_PAGE_HOLD`, `CYLINDRICAL_CUP_OR_PHONE_GRASP`), masking specific rejection diagnostics in the UI HUD.
  2. **Lumbrical Biomechanical Metric Paradox**: Real anatomical lumbrical grip (MCP flexed, PIP/DIP extended) computes `fourMax ~ 0.85-0.95`, bypassing `fourMax < 0.62` and triggering false-positive `OPEN_PALM` (89% confidence) unless MCP joint flexion (`angleAt(wrist, mcp, pip) < 145°`) is directly measured.
  3. **Admin Model Test Coverage**: `storage/admin_trained_model.json` contains 3 trained negative grasp guards, but test harness runs on default in-memory model unless explicitly loaded via `setAdminTrainedModel`.

---

## 1. Observation

### 1.1 Baseline Test Suite Execution
Command:
```powershell
node ./node_modules/tsx/dist/cli.mjs tests/gesture-robustness.test.ts
```
Verbatim stdout excerpt:
```text
== Check 18: Real GitHub HaGRID Dataset Benchmark (500 Stratified Real Human Samples) ==
  ✓ Real HaGRID Stratified Benchmark: 97.40% (487/500)

== Check 19: Strict Object-Grasp & Book-Holding Guard (0.0% False Positives) ==
  ✓ Object-Grasp / Book-Hold False Positives: 0/200 (0.00% FP)

== Check 20: All 10 Gestures under Difficult Lighting + 5.8Hz Tremor (Smoother + Voter) ==
  ✓ All 10 Gestures under Low-Light Jitter + 5.8Hz Tremor: 100.00% (400/400)

== Check 21: Progressive 3-Stage Tremor f0 Personalizer & Irregular Frequency Rejection ==
  ✓ Tremor Personalizer after 14 natural windows: stage=FINALIZED_LOCKED, init=5Hz -> finalized=5.4Hz
  ✓ Irregular 14.2Hz burst rejected=true, activeF0 preserved=5.4Hz

23 passed, 0 failed
```

### 1.2 Grasp Guard Architecture in `src/lib/hand-gesture-engine.ts`
- **Rejection Enum & Interface** (`src/lib/hand-gesture-engine.ts:213-228`):
  ```typescript
  export type ObjectGraspRejectionReason =
    | "NONE"
    | "BOOK_OR_OBJECT_GRASP"
    | "LUMBRICAL_BOOK_CLAMP"
    | "OPEN_BOOK_PAGE_HOLD"
    | "CYLINDRICAL_CUP_OR_PHONE_GRASP"
    | "PALM_OCCLUDED_BY_OBJECT"
    | "ADMIN_LEARNED_NEGATIVE_GRASP";

  export interface ObjectGraspAnalysis {
    isObjectGrasp: boolean;
    reason: ObjectGraspRejectionReason;
    bimodalityScore: number;
    cApertureRatio: number;
    lumbricalFlatness: number;
  }
  ```

- **Guard Evaluation Order in `detectObjectGrasp`** (`src/lib/hand-gesture-engine.ts:329-488`):
  1. **Guard 0 (Lines 374-392)**: `ADMIN_LEARNED_NEGATIVE_GRASP`
     - Evaluates `activeAdminModel.negativeGraspSignatures`.
     - L1 distance threshold `l1 <= 0.11` on `[thumb, idx, mid, rng, pnk]` and aperture difference `apDiff <= 0.25`.
  2. **Guard 1 (Lines 395-403)**: `PALM_OCCLUDED_BY_OBJECT`
     - Triggered when palm aspect ratio `aspect < 0.38 || aspect > 3.6`.
  3. **Guard 2 (Lines 408-417)**: `BOOK_OR_OBJECT_GRASP`
     - Semi-flexed band condition: `semiFlexedCount >= 2 && fourMax < 0.62 && pinchNorm > 0.24`.
  4. **Guard 3 (Lines 421-436)**: `LUMBRICAL_BOOK_CLAMP`
     - Condition: `fourMean >= 0.16 && meanStraight > 0.68 && meanWristReach < 0.36 && fourMax < 0.62 && pinchNorm >= 0.38 && pinchNorm <= 1.1`.
  5. **Guard 4 (Lines 440-455)**: `OPEN_BOOK_PAGE_HOLD`
     - Condition: `thumb >= 0.4 && thumb <= 0.88 && fourMean >= 0.16 && fourMean <= 0.56 && fourMin >= 0.12 && fourMax < 0.64 && fourMax - fourMin < 0.24`.
  6. **Guard 5 (Lines 464-479)**: `CYLINDRICAL_CUP_OR_PHONE_GRASP`
     - Condition: `fourMean >= 0.16 && fourMean <= 0.46 && fourMax < 0.52 && tipToMcpMean > 0.52 && pinchNorm >= 0.42 && pinchNorm <= 0.95`.

- **Classification Short-Circuiting** (`src/lib/hand-gesture-engine.ts:534-546`):
  ```typescript
  const graspAnalysis = detectObjectGrasp(landmarks, handParams);
  if (graspAnalysis.isObjectGrasp) {
    return {
      gesture: "UNKNOWN",
      confidence: 0.12,
      top2Gesture: "FIST",
      margin: 0,
      handParams,
      fingerStates,
      personalizedBoostApplied: false,
      objectGraspAnalysis: graspAnalysis,
    };
  }
  ```

### 1.3 Downstream Actuation Guard in `src/components/LiveCameraStream.tsx`
- **Voting suppression** (`src/components/LiveCameraStream.tsx:520-524`):
  ```typescript
  const voteGesture: RecognizedGesture =
    classification.confidence < 0.5 || intent.transit
      ? "UNKNOWN"
      : classification.gesture;
  vote = voterRef.current.push(voteGesture);
  ```
  Because `confidence: 0.12 < 0.5` and `gesture: "UNKNOWN"`, `"UNKNOWN"` is fed into `GestureVoter`. No smart home action can actuate.
- **Canvas HUD & Telemetry Badges** (`src/components/LiveCameraStream.tsx:663-709, 1045-1065`):
  When `classification?.objectGraspAnalysis?.isObjectGrasp` is true:
  - Canvas badge: `📕 OBJECT GRASP BLOCKED → UNKNOWN (0% Trigger)` with `Reason: ${graspAnalysis.reason}`.
  - HUD telemetry: `BLOCKED (0% FP)` with `graspAnalysis.reason` highlighted in rose.

### 1.4 Observed Rejection Breakdown Across 200 Frames
When executing `detectObjectGrasp` across all 200 test frames generated by `generateObjectGraspLandmarks`:
- Without loading `storage/admin_trained_model.json` (default test suite state):
  - `BOOK_SPINE`: 40/40 returned `BOOK_OR_OBJECT_GRASP`
  - `OPEN_BOOK`: 40/40 returned `BOOK_OR_OBJECT_GRASP`
  - `PHONE_GRASP`: 40/40 returned `BOOK_OR_OBJECT_GRASP`
  - `CUP_MUG`: 40/40 returned `BOOK_OR_OBJECT_GRASP`
  - `OCCLUDED_BOOK`: 40/40 returned `PALM_OCCLUDED_BY_OBJECT`
- With loading `storage/admin_trained_model.json` (`setAdminTrainedModel`):
  - `BOOK_SPINE`: 40/40 returned `ADMIN_LEARNED_NEGATIVE_GRASP`
  - `OPEN_BOOK`: 40/40 returned `ADMIN_LEARNED_NEGATIVE_GRASP`
  - `PHONE_GRASP`: 40/40 returned `ADMIN_LEARNED_NEGATIVE_GRASP`
  - `CUP_MUG`: 40/40 returned `ADMIN_LEARNED_NEGATIVE_GRASP`
  - `OCCLUDED_BOOK`: 40/40 returned `PALM_OCCLUDED_BY_OBJECT`

### 1.5 Genuine Gesture False Rejection Check
Tested `detectObjectGrasp` against all 10 synthetic gestures (50 frames each = 500 frames) and 500 real human HaGRID samples:
- `OPEN_PALM`: 0/50 flagged
- `FIST`: 0/50 flagged
- `VICTORY`: 0/50 flagged
- `POINTING_UP`: 0/50 flagged
- `THUMBS_UP`: 0/50 flagged
- `THUMBS_DOWN`: 0/50 flagged
- `PINCH`: 0/50 flagged
- `THREE_FINGERS`: 0/50 flagged
- `FOUR_FINGERS`: 0/50 flagged
- `CALL_ME`: 0/50 flagged
- Real HaGRID benchmark (500 samples): **0/500 flagged as object grasp**.

### 1.6 Lumbrical Clamp Posture Evaluation
Synthesized realistic tabletop/lumbrical posture (wrist `[0.5, 0.73]`, MCP flexed ~88.2°, PIP and DIP extended straight along book cover, thumb opposing):
- Directly tested in `classifyHandGesture`:
  - Output: `gesture: "OPEN_PALM"`, `confidence: 0.89`!
  - `detectObjectGrasp` returned `isObjectGrasp: false`, `reason: "NONE"`.
- Investigation of metrics for this posture:
  - `meanStraight`: 1.0 (straight fingers)
  - `lumbricalFlatness`: 0.56 (`meanStraight - meanWristReach`)
  - `fourMax`: 0.927
  - `MCP joint angle (wrist-mcp-pip)`: 88.2°
  - Failed Guard 3 because Guard 3 explicitly requires `fourMax < 0.62` and `meanWristReach < 0.36`.

---

## 2. Logic Chain

1. **Suppression Completeness (Observation 1.1, 1.2, 1.3)**:
   - In `tests/gesture-robustness.test.ts`, Check 19 tests all 200 synthetic frames across the 5 specified modes.
   - Every single frame returns `res.gesture === "UNKNOWN"` with confidence 0.12.
   - In `LiveCameraStream.tsx`, confidence < 0.5 routes directly to `"UNKNOWN"` in the voter and UI HUD.
   - Therefore, the requirement of 0.0% false-positive actuation across all 200 frames is fully satisfied in the current test suite.

2. **Shadowing of Specific Postures by Guard 2 (Observation 1.2, 1.4)**:
   - Guard 2 (`BOOK_OR_OBJECT_GRASP`) evaluates if `semiFlexedCount >= 2 && fourMax < 0.62 && pinchNorm > 0.24`.
   - In `generateObjectGraspLandmarks`, modes `OPEN_BOOK`, `PHONE_GRASP`, and `CUP_MUG` generate half-curled finger flexions in `[0.36, 0.42]`, which satisfies `semiFlexedCount >= 2` and `fourMax < 0.62`.
   - Because Guard 2 precedes Guard 4 (`OPEN_BOOK_PAGE_HOLD`) and Guard 5 (`CYLINDRICAL_CUP_OR_PHONE_GRASP`), Guard 2 short-circuits.
   - In an experiment reordering specific posture guards (Guards 3, 4, 5) *before* Guard 2:
     - `PHONE_GRASP` and `CUP_MUG` specifically mapped to `CYLINDRICAL_CUP_OR_PHONE_GRASP`.
     - `OPEN_BOOK` specifically mapped to `OPEN_BOOK_PAGE_HOLD`.
     - `OCCLUDED_BOOK` mapped to `PALM_OCCLUDED_BY_OBJECT`.
     - `BOOK_SPINE` mapped to `BOOK_OR_OBJECT_GRASP`.
   - Reordering preserves the 0.0% false-positive rate while restoring diagnostic classification fidelity.

3. **Lumbrical Grip Vulnerability (Observation 1.6)**:
   - By definition, the lumbrical muscles flex the MCP joints while extending the PIP/DIP joints (the intrinsic-plus posture, as when clamping a thick book cover).
   - In `extractHandParameters`, `fingerExt` is calculated as `0.45 * (0.6 * wristReach + 0.4 * foldBack) + 0.55 * straightness`.
   - For an intrinsic-plus grip, straightness is 1.0 and foldBack is 1.0, driving `fourMax` to ~0.85-0.95.
   - Guard 3 (`LUMBRICAL_BOOK_CLAMP`) requires `fourMax < 0.62`, which is mathematically contradictory to fingers with extended IP joints.
   - Consequently, true lumbrical clamps bypass both Guard 3 and Guard 2, triggering a false-positive `OPEN_PALM` (conf 0.89).
   - Direct measurement of MCP flexion angle (`angleAt(wrist, mcp, pip) < 145°`) or `lumbricalFlatness > 0.45` reliably identifies lumbrical book clamps without false-flagging genuine open palms (which maintain mean MCP angles > 166.7°).

4. **Offline Test Suite vs. Persistent Admin Signatures (Observation 1.2, 1.4)**:
   - `storage/admin_trained_model.json` contains 3 trained negative grasp guards (`adm_1792114717776_a4go`, etc.) with centroid `[0.519, 0.291, 0.370, 0.434, 0.534]`.
   - When loaded, `detectObjectGrasp` triggers Guard 0 (`ADMIN_LEARNED_NEGATIVE_GRASP`).
   - The test script `tests/gesture-robustness.test.ts` does not invoke `setAdminTrainedModel`, so it tests the heuristic fallback branch rather than the active admin learned branch.
   - Testing both branches in Check 19 ensures comprehensive verification of both static geometric heuristics and runtime admin signatures.

---

## 3. Caveats

1. **Synthetic vs. In-the-Wild Posture Variation**:
   - `generateObjectGraspLandmarks` generates synthetic MediaPipe landmarks with parametric Gaussian jitter and tremor. While this verifies the algorithmic guard against canonical grasp geometries, physical camera capture with diverse user hand shapes and severe occlusion may produce noisy landmark topologies.
2. **Camera Perspective Foreshortening**:
   - Extreme foreshortening along the camera optical axis (e.g. hand viewed from directly above the fingertips) can compress 2D projected segment lengths and distort aspect ratios.
3. **No Code Modifications Performed**:
   - In accordance with the Teamwork explorer role, no code changes have been applied to `src/` or `tests/`.

---

## 4. Conclusion & Recommended Implementation Strategy

### Assessment
The current implementation of Requirement 1 (R1) in `SteadyGate 2.0` is functionally robust and **currently passes all 200 evaluation frames with 0.0% false-positive actuation** in `tests/gesture-robustness.test.ts`. Downstream actuation is completely locked out when an object grasp is detected.

However, two targeted refinements will elevate the guard from "passing synthetic tests" to production-grade biomechanical defense:

### Recommended Changes for Implementer

1. **Reorder Guard Hierarchy in `detectObjectGrasp` (`src/lib/hand-gesture-engine.ts`)**:
   - Keep Guard 0 (`ADMIN_LEARNED_NEGATIVE_GRASP`) first.
   - Keep Guard 1 (`PALM_OCCLUDED_BY_OBJECT`) second.
   - Place Guard 3 (`LUMBRICAL_BOOK_CLAMP`), Guard 4 (`OPEN_BOOK_PAGE_HOLD`), and Guard 5 (`CYLINDRICAL_CUP_OR_PHONE_GRASP`) *before* Guard 2.
   - Keep Guard 2 (`BOOK_OR_OBJECT_GRASP`) as the general semi-flexed catch-all fallback.

2. **Fix Lumbrical Grip Biomechanical Detection (`src/lib/hand-gesture-engine.ts:421-436`)**:
   - Replace the contradictory `fourMax < 0.62` requirement in Guard 3 with an MCP joint angle check:
     ```typescript
     const mIdx = angleAt(wrist, landmarks[5], landmarks[6]);
     const mMid = angleAt(wrist, landmarks[9], landmarks[10]);
     const mRng = angleAt(wrist, landmarks[13], landmarks[14]);
     const mPnk = angleAt(wrist, landmarks[17], landmarks[18]);
     const meanMcpAngle = (mIdx + mMid + mRng + mPnk) / 4.0;
     const dIdx = dist(landmarks[8], landmarks[5]) / palmLen;
     const dMid = dist(landmarks[12], landmarks[9]) / palmLen;
     const dRng = dist(landmarks[16], landmarks[13]) / palmLen;
     const dPnk = dist(landmarks[20], landmarks[17]) / palmLen;
     const minTipToMcp = Math.min(dIdx, dMid, dRng, dPnk);

     if (
       meanStraight > 0.65 &&
       meanMcpAngle < 145 &&
       minTipToMcp > 0.55 &&
       pinchNorm > 0.35
     ) {
       return {
         isObjectGrasp: true,
         reason: "LUMBRICAL_BOOK_CLAMP",
         bimodalityScore: Math.round(bimodalityScore * 100) / 100,
         cApertureRatio: Math.round(pinchNorm * 100) / 100,
         lumbricalFlatness: Math.round(lumbricalFlatness * 100) / 100,
       };
     }
     ```

3. **Expand Check 19 in `tests/gesture-robustness.test.ts` to Test Both Modes**:
   - Pass A: Test default heuristic guards (verifying 0/200 false positives and specific reasons).
   - Pass B: Load `storage/admin_trained_model.json` via `setAdminTrainedModel` and verify `ADMIN_LEARNED_NEGATIVE_GRASP` triggers on admin-matched postures with 0/200 false positives.

---

## 5. Verification Method

To independently verify this investigation:
1. **Run Full Robustness Test Suite**:
   ```powershell
   node ./node_modules/tsx/dist/cli.mjs tests/gesture-robustness.test.ts
   ```
   *Expected Result*: All 23 checks pass, 0 fail. Check 19 confirms `0/200 (0.00% FP)`.
2. **Verify Type Safety**:
   ```powershell
   node ./node_modules/typescript/bin/tsc --noEmit
   ```
   *Expected Result*: Clean exit with 0 errors.
3. **Verify Grasp Reason Distribution Script**:
   ```powershell
   node ./node_modules/tsx/dist/cli.mjs -e "import { generateObjectGraspLandmarks, detectObjectGrasp } from './src/lib/hand-gesture-engine'; ['BOOK_SPINE', 'OPEN_BOOK', 'PHONE_GRASP', 'CUP_MUG', 'OCCLUDED_BOOK'].forEach(m => { console.log(m, detectObjectGrasp(generateObjectGraspLandmarks(m)).reason); });"
   ```
4. **Invalidation Conditions**:
   - Any false positive (> 0/200) on object-holding frames.
   - Any true gesture in the 500 HaGRID samples or 10 core gestures being falsely rejected by `detectObjectGrasp`.
