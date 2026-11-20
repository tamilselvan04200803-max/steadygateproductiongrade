import { buildStandardHeldOutEvaluationSuite } from "../src/lib/real-webcam-evaluator";

const suite = buildStandardHeldOutEvaluationSuite();

// Analyze the provenance labels vs actual source
console.log('=== PROVENANCE ACCURACY ANALYSIS ===');
console.log('\n1. HaGRID stratified samples (labeled GENUINE_WEBCAM):');
const hagrid = suite.filter(s => s.notes && s.notes.includes('HaGRID'));
console.log('Count:', hagrid.length);
console.log('Source: HaGRID dataset via MediaPipe landmark extraction (real human webcam photos)');
hagrid.slice(0, 3).forEach(s => console.log('  ', s.id, s.targetGesture, s.dataProvenance));

console.log('\n2. Real failure cases (labeled GENUINE_WEBCAM):');
const realCases = suite.filter(s => s.id.startsWith('eval_real_case_'));
console.log('Count:', realCases.length);
console.log('Source: Exact 21-landmark fixtures reconstructed from 3 live camera screenshots');
realCases.forEach(s => console.log('  ', s.id, s.targetGesture, s.dataProvenance, '-', s.notes));

console.log('\n3. Negative object holds - Book/Phone/Mug/Occluded (labeled GENUINE_WEBCAM):');
const negHolds = suite.filter(s => s.isNegativeHold && s.negativeHoldType && ['Book Spine Hold', 'Open Book Page Hold', 'Smartphone Texting Hold', 'Coffee Mug Handle Hold', 'Occluded Book Grip'].includes(s.negativeHoldType));
console.log('Count:', negHolds.length);
console.log('Source: SYNTHETIC - generateObjectGraspLandmarks() mathematical generator');
negHolds.slice(0, 3).forEach(s => console.log('  ', s.id, s.negativeHoldType, s.dataProvenance, '-', s.notes));

console.log('\n4. Conversational Idle (labeled GENUINE_WEBCAM):');
const idle = suite.filter(s => s.negativeHoldType === 'Conversational Idle');
console.log('Count:', idle.length);
console.log('Source: SYNTHETIC - generateSyntheticGestureLandmarks("UNKNOWN") mathematical generator');
idle.slice(0, 3).forEach(s => console.log('  ', s.id, s.dataProvenance, '-', s.notes));

console.log('\n5. Environmental stress samples (LOW_LIGHT, GLARE, PARTIAL_OCCLUSION):');
const stress = suite.filter(s => s.lighting !== 'NORMAL_DIFFUSE' || s.visibility !== 'FULL_VISIBILITY');
console.log('Count:', stress.length);
console.log('Source: SYNTHETIC - mathematical transformations on synthetic landmarks');
stress.slice(0, 3).forEach(s => console.log('  ', s.id, s.lighting, s.visibility, s.dataProvenance, '-', s.notes));

console.log('\n6. Contracture samples (labeled SYNTHETIC_SIMULATION):');
const contracture = suite.filter(s => s.movement === 'CONTRACTURE_ROM');
console.log('Count:', contracture.length);
console.log('Source: SYNTHETIC - mathematical deformation of synthetic OPEN_PALM landmarks');
contracture.slice(0, 3).forEach(s => console.log('  ', s.id, s.dataProvenance, '-', s.notes));

console.log('\n7. Rest tremor samples (labeled SYNTHETIC_SIMULATION):');
const tremor = suite.filter(s => s.movement === 'REST_TREMOR');
console.log('Count:', tremor.length);
console.log('Source: SYNTHETIC - generateSyntheticGestureLandmarks with tremor parameters');
tremor.slice(0, 3).forEach(s => console.log('  ', s.id, s.dataProvenance, '-', s.notes));

// Summary
console.log('\n=== SUMMARY ===');
const genuineCount = suite.filter(s => s.dataProvenance === 'GENUINE_WEBCAM').length;
const syntheticCount = suite.filter(s => s.dataProvenance === 'SYNTHETIC_SIMULATION').length;
console.log('Labeled GENUINE_WEBCAM:', genuineCount);
console.log('Labeled SYNTHETIC_SIMULATION:', syntheticCount);
console.log('Total:', suite.length);

console.log('\n=== TRUE PROVENANCE BREAKDOWN ===');
console.log('Truly genuine webcam (HaGRID):', hagrid.length);
console.log('Truly genuine webcam (real screenshots):', realCases.length);
console.log('Actually synthetic but labeled GENUINE_WEBCAM (neg holds + idle):', negHolds.length + idle.length);
console.log('Actually synthetic and labeled SYNTHETIC_SIMULATION:', syntheticCount);