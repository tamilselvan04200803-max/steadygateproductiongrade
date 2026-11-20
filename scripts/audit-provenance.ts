import { buildStandardHeldOutEvaluationSuite } from "../src/lib/real-webcam-evaluator";

const suite = buildStandardHeldOutEvaluationSuite();
const counts = { GENUINE_WEBCAM: 0, SYNTHETIC_SIMULATION: 0 };
for (const s of suite) {
  counts[s.dataProvenance]++;
}
console.log('Evaluation suite provenance breakdown:');
console.log(counts);
console.log('Total:', suite.length);

// Count by target gesture
const byGesture: Record<string, number> = {};
for (const s of suite) {
  byGesture[s.targetGesture] = (byGesture[s.targetGesture] || 0) + 1;
}
console.log('By target gesture:');
console.log(byGesture);

// Count HaGRID samples
const hagrid = suite.filter(s => s.notes && s.notes.includes('HaGRID'));
console.log('HaGRID stratified samples:', hagrid.length);

// Count real failure cases
const realCases = suite.filter(s => s.id.startsWith('eval_real_case_'));
console.log('Real failure cases:', realCases.length);

// Count negative holds tagged as GENUINE_WEBCAM
const negHolds = suite.filter(s => s.isNegativeHold && s.dataProvenance === 'GENUINE_WEBCAM');
console.log('Negative holds (GENUINE_WEBCAM):', negHolds.length);

// Count conversational idle tagged as GENUINE_WEBCAM
const idle = suite.filter(s => s.targetGesture === 'NONE' && !s.isNegativeHold && s.dataProvenance === 'GENUINE_WEBCAM');
console.log('Conversational idle (GENUINE_WEBCAM):', idle.length);

// Show first few samples of each provenance
console.log('\n--- GENUINE_WEBCAM samples (first 10) ---');
suite.filter(s => s.dataProvenance === 'GENUINE_WEBCAM').slice(0, 10).forEach(s => console.log(s.id, s.targetGesture, s.notes));

console.log('\n--- SYNTHETIC_SIMULATION samples (first 10) ---');
suite.filter(s => s.dataProvenance === 'SYNTHETIC_SIMULATION').slice(0, 10).forEach(s => console.log(s.id, s.targetGesture, s.notes));