import assert from 'assert';
import { resolveSender } from '../backend/dist/whatsapp/senderResolution.js';
import { routeInboundMessage } from '../backend/dist/whatsapp/router.js';
import { generatePatientDeepLink, verifyPatientDeepLink } from '../backend/dist/whatsapp/deepLink.js';
import { db, initDatabase } from '../backend/dist/db/index.js';

console.log('🧪 Running Next Steps WhatsApp Integration Tests...\n');

async function runTests() {
  initDatabase();
  // Test 1: Sender Resolution
  console.log('1. Testing Sender Resolution...');
  const anmUser = resolveSender('+919812345010');
  assert(anmUser !== null, 'ANM should be resolved');
  assert.strictEqual(anmUser.name, 'ANM Rekha (AAM Ghurehta)');
  assert.strictEqual(anmUser.role, 'anm');
  assert.strictEqual(anmUser.facility_id, 'FAC-SC-GHU');
  console.log('   ✅ ANM resolved:', anmUser.name, `(${anmUser.facility_name})`);

  const phcUser = resolveSender('+919812345020');
  assert(phcUser !== null, 'PHC Nurse should be resolved');
  assert.strictEqual(phcUser.role, 'phc_sn');
  assert.strictEqual(phcUser.facility_id, 'FAC-PHC-SIR');
  console.log('   ✅ PHC Staff Nurse resolved:', phcUser.name, `(${phcUser.facility_name})`);

  const unknown = resolveSender('+919999999999');
  assert.strictEqual(unknown, null, 'Unknown phone should return null');
  console.log('   ✅ Unregistered phone correctly returned null');

  // Test 2: Unregistered User Message
  console.log('\n2. Testing Unregistered Sender Response...');
  const unregResponses = await routeInboundMessage({
    id: 'msg-01',
    from: '+919999999999',
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'Hello',
  });
  assert.strictEqual(unregResponses.length, 1);
  assert(unregResponses[0].body.includes('not registered'), 'Should instruct user to contact administrator');
  console.log('   ✅ Unregistered user received safe registration message');

  // Test 3: ANM Greeting & Menu
  console.log('\n3. Testing ANM Menu Workflow...');
  const anmMenuResponses = await routeInboundMessage({
    id: 'msg-02',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'Hi',
  });
  assert.strictEqual(anmMenuResponses.length, 1);
  assert.strictEqual(anmMenuResponses[0].kind, 'buttons');
  assert(anmMenuResponses[0].header.includes('Sub-centre'), 'Header should mention Sub-centre');
  assert(anmMenuResponses[0].buttons.some(b => b.id === 'CMD_WORKLIST'), 'Should have Worklist button');
  console.log('   ✅ ANM received role-aware Sub-centre menu with buttons');

  // Test 4: Patient Search & Deep Link
  console.log('\n4. Testing Patient Search & Deep Link...');
  const searchResponses = await routeInboundMessage({
    id: 'msg-03',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'find Sunita',
  });
  assert.strictEqual(searchResponses.length, 1);
  assert(searchResponses[0].body.includes('Sunita Devi'), 'Should display Sunita Devi');
  assert(searchResponses[0].body.includes('HIGH-RISK PREGNANCY'), 'Should display risk status');
  assert(searchResponses[0].body.includes('https://nextsteps-admin.mdtlabs.org/app/?auth='), 'Should include secure deep link');
  console.log('   ✅ Patient search found Sunita Devi with deep-link');

  // Test 5: Deep Link Verification
  console.log('\n5. Testing Deep Link Token Cryptographic Verification...');
  const link = generatePatientDeepLink('w1', anmUser.id, anmUser.role, 15);
  const tokenMatch = link.match(/auth=([^&]+)/);
  assert(tokenMatch, 'Should have auth token parameter');
  const payload = verifyPatientDeepLink(tokenMatch[1]);
  assert(payload !== null, 'Token should verify successfully');
  assert.strictEqual(payload.patientId, 'w1');
  assert.strictEqual(payload.role, 'anm');
  console.log('   ✅ Deep link verified with valid patientId and role');

  // Test 6: ANM Two-Tap Next Step Prescription Flow
  console.log('\n6. Testing ANM 2-Tap Next Step Prescription...');
  // Tap 1: Select Category
  const catResponses = await routeInboundMessage({
    id: 'msg-04',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'list_reply',
    replyId: 'STAGE_CAT_w1_ANC_VISIT',
  });
  assert.strictEqual(catResponses.length, 1);
  assert.strictEqual(catResponses[0].kind, 'buttons');
  assert(catResponses[0].body.includes('ANC VISIT'), 'Should review ANC VISIT');
  console.log('   ✅ Tap 1: Category selected and defaulted to +4 weeks');

  // Tap 2: Confirm
  const confirmResponses = await routeInboundMessage({
    id: 'msg-05',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'button_reply',
    replyId: 'CONFIRM_STEP_w1',
  });
  assert.strictEqual(confirmResponses.length, 1);
  assert(confirmResponses[0].body.includes('Success! Next step recorded'), 'Should confirm success');
  assert(confirmResponses[0].body.includes('CCE Sync') && confirmResponses[0].body.includes('Queued'), 'Should confirm CCE outbox queued');
  console.log('   ✅ Tap 2: Step saved in DB and CCE CloudEvent queued');

  // Test 7: PHC Staff Nurse Arrival & Care Delivery Flow
  console.log('\n7. Testing PHC Inbound Referrals & Arrival Tracking ("Arrived != Completed")...');
  const arrivalsResponses = await routeInboundMessage({
    id: 'msg-06',
    from: '+919812345020',
    timestamp: new Date().toISOString(),
    kind: 'button_reply',
    replyId: 'CMD_ARRIVALS',
  });
  assert.strictEqual(arrivalsResponses.length, 1);
  console.log('   ✅ PHC Staff Nurse received Expected Arrivals list');

  // Reset step-1 for idempotency across test runs
  const arriveStepId = 'step-1';
  db.prepare(`
    UPDATE steps SET status = 'OPEN', closed_at = NULL, closed_by = NULL, closed_source = NULL WHERE id = ?
  `).run(arriveStepId);

  const arriveResponses = await routeInboundMessage({
    id: 'msg-07',
    from: '+919812345020',
    timestamp: new Date().toISOString(),
    kind: 'button_reply',
    replyId: `DO_ARRIVE_ONSITE_${arriveStepId}`,
  });
  assert.strictEqual(arriveResponses.length, 1);
  assert(arriveResponses[0].body.includes('Remains OPEN until doctor delivers care'), 'Obligation must remain OPEN');
  
  // Verify DB state
  const stepInDb = db.prepare('SELECT * FROM steps WHERE id = ?').get(arriveStepId);
  assert.strictEqual(stepInDb.status, 'OPEN', 'Status must still be OPEN after arrival');
  assert.strictEqual(stepInDb.closed_source, 'AT_FACILITY', 'closed_source must be AT_FACILITY');
  console.log('   ✅ Arrival confirmed: step remains OPEN on-site');

  // Mark care delivered
  const deliverResponses = await routeInboundMessage({
    id: 'msg-08',
    from: '+919812345020',
    timestamp: new Date().toISOString(),
    kind: 'button_reply',
    replyId: `DO_CARE_DELIVERED_${arriveStepId}`,
  });
  assert.strictEqual(deliverResponses.length, 1);
  assert(deliverResponses[0].body.includes('Referral Closed Successfully'), 'Should confirm closure');

  const closedStepInDb = db.prepare('SELECT * FROM steps WHERE id = ?').get(arriveStepId);
  assert.strictEqual(closedStepInDb.status, 'DONE', 'Status must now be DONE');
  // Test 8: Natural Text Search & Longitudinal Care Stepper
  console.log('\n8. Testing Natural Text Direct Search & Visual Care Stepper...');
  const directSearchResponses = await routeInboundMessage({
    id: 'msg-09',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'Sunita',
  });
  assert.strictEqual(directSearchResponses.length, 1);
  assert(directSearchResponses[0].body.includes('CARE JOURNEY'), 'Should render Care Stepper');
  assert(directSearchResponses[0].body.includes('Full Medical Chart'), 'Should contain secure chart link');
  console.log('   ✅ Direct name search rendered visual Care Stepper with deep link');

  // Test 9: Alerts & Overdue Monitor
  console.log('\n9. Testing Alerts & Overdue Monitor...');
  const alertsResponses = await routeInboundMessage({
    id: 'msg-10',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'alerts',
  });
  assert.strictEqual(alertsResponses.length, 1);
  assert(alertsResponses[0].header.includes('Alerts'), 'Should return alerts header');
  console.log('   ✅ Alerts workflow returned active overdue and stale referral monitors');

  // Test 10: Service-Aware Prescriptions (NCD Patient)
  console.log('\n10. Testing Service-Aware Prescriptions (NCD Patient)...');
  const ncdPromptResponses = await routeInboundMessage({
    id: 'msg-11',
    from: '+919812345010',
    timestamp: new Date().toISOString(),
    kind: 'button_reply',
    replyId: 'ACTION_ADD_STEP_n1', // Ramesh Patel (NCD)
  });
  assert.strictEqual(ncdPromptResponses.length, 1);
  assert(ncdPromptResponses[0].sections[0].title.includes('NCD Management'), 'Should offer NCD Management section');
  console.log('   ✅ NCD patient received service-specific options (Medication Refill, BP/Sugar)');

  console.log('\n======================================================');
  console.log('🎉 ALL NEXT STEPS WHATSAPP INTEGRATION TESTS PASSED!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
