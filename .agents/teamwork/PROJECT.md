# Project: SteadyGate 2.0 Robustness & Verification Assurance

## Architecture
SteadyGate 2.0 is an assistive smart-home gesture platform designed for tremor-affected and motor-impaired individuals.
- **Vision Pre-Processing Layer** (`src/lib/vision-runtime.ts`): Real-time perceptual luminance, contrast, edge clutter, and logarithmic SNR extraction with dynamic gamma (0.75 in low light, 1.35 in harsh glare) and CLAHE contrast enhancement (1.0x-2.2x).
- **Biomechanical Gesture & Grasp Guard Layer** (`src/lib/hand-gesture-engine.ts`): MediaPipe hand landmark processing, 10-gesture classifier, and multi-tier object-grasp suppression (lumbrical book clamp, open-book page hold, cylindrical grasp, aspect-ratio anomaly, and admin-learned negative grasp signatures).
- **Personalized Tremor Signal Processing Layer** (`src/lib/signal-processing.ts`): Adaptive 3-stage tremor frequency tracker (Stage 1 `INITIALIZED_60S_CALIB`, Stage 2 `OBSERVING_CONFIRMATION`, Stage 3 `FINALIZED_LOCKED`), human tremor notch filtering (92% attenuation), and irregular frequency rejection (>12 Hz or low SCR).
- **Administrator AI Gesture Trainer & Dataset Studio** (`src/components/AdminGestureTrainer.tsx`, `src/app/api/admin-train/route.ts`): Single-frame and 25-frame burst training, morphological and lighting feature extraction, persistent weights in `storage/admin_trained_model.json`, batch CSV/JSON ingestion, and live classifier synchronization.
- **Robustness & Acceptance Verification Suite** (`tests/gesture-robustness.test.ts`): 23-check end-to-end test suite verifying gesture accuracy, tremor filtering, grasp suppression, real HaGRID benchmark, and frequency personalizer.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1 Object Grasp & Book Guard | Suppress object-holding postures (lumbrical clamp, open-book, phone/cup, occlusion, admin negative signatures) guaranteeing 0.0% FP across 200 evaluation frames | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R2 Difficult-Lighting & CLAHE | Real-time luminance, contrast, clutter, SNR, dynamic gamma (0.75 low light, 1.35 harsh glare), and CLAHE enhancement (1.0x-2.2x) | M2 | ORIGINAL_REQUEST §R2 |
| 3 | R3 Progressive Tremor f0 Tracker | 3-stage personalizer (`INITIALIZED_60S_CALIB`, `OBSERVING_CONFIRMATION`, `FINALIZED_LOCKED`), notch filter fine-tuning, and irregular vibration rejection (>12 Hz) | M3 | ORIGINAL_REQUEST §R3 |
| 4 | R4 Admin AI Gesture Trainer | Live posture capture (1-frame & 25-frame burst), morphological/lighting vectors, persistence to `storage/admin_trained_model.json`, CSV/JSON ingestion, classifier sync | M4 | ORIGINAL_REQUEST §R4 |
| 5 | Acceptance Test & Build Verification | 23/23 tests passing in `tests/gesture-robustness.test.ts`, 0 typecheck errors (`tsc --noEmit`), clean Next.js build (`next build`) | M5 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: R1 Grasp Guard Hardening | Refine guard hierarchy & biomechanical lumbrical check in `src/lib/hand-gesture-engine.ts`; verify 0.0% FP across 200 frames | none | DONE |
| 2 | M2: R2 Lighting & CLAHE Harmonization | Harmonize gamma (0.75 low light, 1.35 glare) and CLAHE contrast range (1.0x-2.2x) in `src/lib/vision-runtime.ts` | none | DONE |
| 3 | M3: R3 Tremor f0 Tracker Verification | Verify 3-stage transitions, <=0.6 Hz deviation lock, and irregular vibration rejection in `src/lib/signal-processing.ts` | none | DONE |
| 4 | M4: R4 Admin Trainer & Dataset Studio Validation | Validate burst capture, feature vector computation, persistence, CSV/JSON ingestion, and classifier synchronization | none | DONE |
| 5 | M5: E2E Robustness & Build Acceptance | Execute full 23-check test harness, `tsc --noEmit`, and `next build` ensuring 100% pass and 0 errors | M1, M2, M3, M4 | DONE |

## Code Layout
- `src/lib/hand-gesture-engine.ts`: Owned exclusively by M1 Worker
- `src/lib/vision-runtime.ts`: Owned exclusively by M2 Worker
- `src/lib/signal-processing.ts`: Verified in M3
- `src/components/AdminGestureTrainer.tsx` & `src/app/api/admin-train/route.ts`: Verified in M4
- `tests/gesture-robustness.test.ts`: Robustness test harness (executed across all milestones)

## Interface Contracts
### `detectObjectGrasp(landmarks, handParams): ObjectGraspAnalysis`
- Input: `landmarks: Landmark3D[]`, `handParams: HandGeometryParams`
- Output: `ObjectGraspAnalysis { isObjectGrasp: boolean, reason: ObjectGraspRejectionReason, bimodalityScore: number, cApertureRatio: number, lumbricalFlatness: number }`
- Contract: If `isObjectGrasp === true`, `classifyHandGesture` MUST immediately return `gesture: "UNKNOWN"`, suppressing downstream actuation.

### `SceneAnalyzer.analyse(video): SceneAnalysisResult`
- Computes `luminance`, `contrast`, `clutter`, `snrDb`, `gamma`, `gain`, `contrastGain`, `claheActive`, and `lightingCondition`.
- Low-light gamma centers on 0.75, harsh glare gamma clamped at 1.35, contrastGain scales up to 2.2x.
