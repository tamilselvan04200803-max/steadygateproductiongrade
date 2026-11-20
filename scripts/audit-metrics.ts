import { buildStandardHeldOutEvaluationSuite } from "../src/lib/real-webcam-evaluator";
import { classifyHandGesture, getAdminTrainedModel, setAdminTrainedModel } from "../src/lib/hand-gesture-engine";

const suite = buildStandardHeldOutEvaluationSuite();

// Let's manually recompute the B0 baseline metrics for OPEN_PALM contracture samples
const defaultAdmin = getAdminTrainedModel();
setAdminTrainedModel(defaultAdmin);

const contracture = suite.filter(s => s.movement === 'CONTRACTURE_ROM');
console.log('Contracture samples:', contracture.length);

let correct = 0;
for (const s of contracture) {
  const res = classifyHandGesture(s.landmarks, null);
  if (res.gesture === 'OPEN_PALM') correct++;
}
console.log('B0 correct on contracture OPEN_PALM:', correct, '/', contracture.length);

// Now check the enrolled model
const enrolledProfile = {
  id: 'eval_enrolled_p01',
  name: 'Arthur Pendelton (Enrolled)',
  condition: 'Parkinsonian Resting Tremor & Finger Contracture',
  f0Hz: 5.2,
  amplitudeRms: 0.045,
  notchBandwidthHz: 2.0,
  attentionFloor: 0.62,
  adaptiveDwellFactor: 1.25,
  medicationPhase: 'ON Phase',
  palmScale: 0.20,
  fingerFlexibility: 0.96,
  personalizedPrototypes: JSON.stringify({
    FIST: { centroid: [0.28, 0.15, 0.12, 0.10, 0.10], confidenceBoost: 1.15, flexTol: 0.24 },
    OPEN_PALM: { centroid: [0.35, 0.68, 0.68, 0.68, 0.68], confidenceBoost: 1.20, flexTol: 0.28 },
    THUMBS_UP: { centroid: [0.40, 0.20, 0.15, 0.12, 0.10], confidenceBoost: 1.15, flexTol: 0.24 },
    VICTORY: { centroid: [0.30, 0.75, 0.72, 0.15, 0.12], confidenceBoost: 1.15, flexTol: 0.24 },
    POINTING_UP: { centroid: [0.25, 0.78, 0.15, 0.12, 0.10], confidenceBoost: 1.15, flexTol: 0.24 },
  }),
};

setAdminTrainedModel(defaultAdmin);
let correctB1 = 0;
for (const s of contracture) {
  const res = classifyHandGesture(s.landmarks, enrolledProfile);
  if (res.gesture === 'OPEN_PALM') correctB1++;
}
console.log('B1 correct on contracture OPEN_PALM:', correctB1, '/', contracture.length);

// Check a few samples to see what B0 predicts
console.log('\nB0 predictions on first 5 contracture samples:');
for (let i = 0; i < 5; i++) {
  const res = classifyHandGesture(contracture[i].landmarks, null);
  console.log('  Sample', i, ':', res.gesture, 'conf=', res.confidence.toFixed(2));
}

console.log('\nB1 predictions on first 5 contracture samples:');
for (let i = 0; i < 5; i++) {
  const res = classifyHandGesture(contracture[i].landmarks, enrolledProfile);
  console.log('  Sample', i, ':', res.gesture, 'conf=', res.confidence.toFixed(2));
}