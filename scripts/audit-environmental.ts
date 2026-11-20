import { buildStandardHeldOutEvaluationSuite } from "../src/lib/real-webcam-evaluator";

const suite = buildStandardHeldOutEvaluationSuite();

// Check environmental stress samples - are they from real camera or synthetic?
console.log('=== ENVIRONMENTAL STRESS SAMPLE SOURCES ===');

const lowLight = suite.filter(s => s.lighting === 'LOW_LIGHT');
console.log('LOW_LIGHT samples:', lowLight.length);
console.log('Source:', lowLight[0]?.notes);
console.log('Provenance:', lowLight[0]?.dataProvenance);

const glare = suite.filter(s => s.lighting === 'GLARE');
console.log('\nGLARE samples:', glare.length);
console.log('Source:', glare[0]?.notes);
console.log('Provenance:', glare[0]?.dataProvenance);

const occlusion = suite.filter(s => s.visibility === 'PARTIAL_OCCLUSION');
console.log('\nPARTIAL_OCCLUSION samples:', occlusion.length);
console.log('Source:', occlusion[0]?.notes);
console.log('Provenance:', occlusion[0]?.dataProvenance);

// Check tremor samples
const restTremor = suite.filter(s => s.movement === 'REST_TREMOR');
console.log('\nREST_TREMOR samples:', restTremor.length);
console.log('Source:', restTremor[0]?.notes);
console.log('Provenance:', restTremor[0]?.dataProvenance);

// Check if CLAHE/gamma correction were actually applied
console.log('\n=== CLAHE/GAMMA CLAIM VERIFICATION ===');
console.log('The evaluation uses synthetic landmarks with mathematical noise/compression.');
console.log('No actual CLAHE or gamma correction was applied to real camera images.');
console.log('The stress matrix F1 values come from the classifier running on SYNTHETIC landmarks.');