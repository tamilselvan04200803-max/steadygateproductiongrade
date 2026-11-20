import { buildStandardHeldOutEvaluationSuite } from "../src/lib/real-webcam-evaluator";

const suite = buildStandardHeldOutEvaluationSuite();

// Check the 'Conversational Idle' samples - are they really genuine webcam?
const idle = suite.filter(s => s.negativeHoldType === 'Conversational Idle');
console.log('Conversational Idle samples:');
idle.slice(0, 5).forEach(s => console.log(s.id, s.dataProvenance, s.notes));

// Check the negative object holds labeled GENUINE_WEBCAM
const negHolds = suite.filter(s => s.isNegativeHold && s.negativeHoldType && ['Book Spine Hold', 'Open Book Page Hold', 'Smartphone Texting Hold', 'Coffee Mug Handle Hold', 'Occluded Book Grip'].includes(s.negativeHoldType));
console.log('\nNegative object holds (Book/Phone/Mug/Occluded):');
negHolds.slice(0, 10).forEach(s => console.log(s.id, s.negativeHoldType, s.dataProvenance, s.notes));

// Check real failure cases - are they truly from live webcam?
const realCases = suite.filter(s => s.id.startsWith('eval_real_case_'));
console.log('\nReal failure cases:');
realCases.forEach(r => console.log(r.id, r.targetGesture, r.dataProvenance, r.notes));