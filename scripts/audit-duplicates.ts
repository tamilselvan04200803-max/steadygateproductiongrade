import { buildStandardHeldOutEvaluationSuite } from "../src/lib/real-webcam-evaluator";

const suite = buildStandardHeldOutEvaluationSuite();

// Check for duplicate landmarks across samples
const landmarksMap = new Map();
let duplicates = 0;
for (const s of suite) {
  const key = s.landmarks.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join('|');
  if (landmarksMap.has(key)) {
    duplicates++;
    console.log('DUPLICATE:', s.id, 'matches', landmarksMap.get(key));
  } else {
    landmarksMap.set(key, s.id);
  }
}
console.log('Total duplicates:', duplicates);

// Check HaGRID samples vs real failure cases
const hagrid = suite.filter(s => s.notes && s.notes.includes('HaGRID'));
console.log('HaGRID samples count:', hagrid.length);
const realCases = suite.filter(s => s.id.startsWith('eval_real_case_'));
console.log('Real failure cases count:', realCases.length);
realCases.forEach(r => console.log(r.id, r.targetGesture, r.notes));

// Check contracture samples
const contracture = suite.filter(s => s.movement === 'CONTRACTURE_ROM');
console.log('Contracture samples:', contracture.length);
contracture.slice(0, 5).forEach(c => console.log(c.id, c.targetGesture, c.dataProvenance, c.notes));

// Check tremor samples
const tremor = suite.filter(s => s.movement === 'REST_TREMOR');
console.log('Rest tremor samples:', tremor.length);

// Check negative holds
const negHolds = suite.filter(s => s.isNegativeHold);
console.log('Total negative holds:', negHolds.length);
const negByType: Record<string, number> = {};
for (const n of negHolds) {
  const key = n.negativeHoldType || "UNKNOWN_TYPE";
  negByType[key] = (negByType[key] || 0) + 1;
}
console.log('Negative holds by type:', negByType);