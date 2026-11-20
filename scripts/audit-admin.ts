import { getAdminTrainedModel } from "../src/lib/hand-gesture-engine";

const admin = getAdminTrainedModel();
console.log('Admin model version:', admin.version);
console.log('Total samples trained:', admin.totalSamplesTrained);
console.log('Gesture prototypes count:', Object.keys(admin.gesturePrototypes || {}).length);
console.log('Negative grasp signatures:', admin.negativeGraspSignatures.length);

// Compare with default baseline - are they the same?
console.log('\nAdmin prototypes:');
for (const [k, v] of Object.entries(admin.gesturePrototypes || {})) {
  console.log(' ', k, v ? 'defined' : 'undefined');
}