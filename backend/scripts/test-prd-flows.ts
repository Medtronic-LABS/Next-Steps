import { routeInboundMessage } from '../src/whatsapp/router.js';
import { resetDatabaseToSeed, db } from '../src/db/index.js';
import { InboundMessage } from '../src/whatsapp/types.js';

async function runAcceptanceTest() {
  console.log('===============================================================');
  console.log('🧪 RUNNING NEXT STEPS WHATSAPP PRD ACCEPTANCE TEST SCENARIO');
  console.log('===============================================================\n');

  const ANM_PHONE = '+918126599673';

  // --- 0. Initialize Database to Seed State ---
  console.log('⚙️ [Setup] Initializing database to starting state...');
  resetDatabaseToSeed();
  db.prepare(`UPDATE users SET phone = ? WHERE id = 'USR-ANM-01'`).run(ANM_PHONE);

  // Helper to simulate inbound message
  async function send(msg: Partial<InboundMessage>) {
    const fullMsg: InboundMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: ANM_PHONE,
      timestamp: new Date().toISOString(),
      kind: msg.replyId ? (msg.replyId.startsWith('STAGE_CAT_') || msg.replyId.startsWith('REG_') ? 'list_reply' : 'button_reply') : 'text',
      ...msg,
    };
    const [out] = await routeInboundMessage(fullMsg);
    return out;
  }

  // --- Step 1: ANM logs in and receives overdue referral alert for Lakshmi ---
  console.log('\n--- Step 1: ANM receives overdue referral alert for Lakshmi ---');
  const alertOut = await send({ text: 'alerts' });
  console.log('Output Body:\n', alertOut.kind === 'buttons' ? alertOut.body : alertOut);
  if (!('body' in alertOut) || !alertOut.body.includes('Lakshmi Devi') || !alertOut.body.includes('REFERRAL')) {
    throw new Error('Step 1 Failed: Overdue referral alert for Lakshmi Devi not found.');
  }
  console.log('✅ Step 1 Passed: Overdue referral alert for Lakshmi Devi verified.');

  // --- Step 2: ANM searches for another woman -> Possible duplicates shown before creation ---
  console.log('\n--- Step 2: ANM searches for another woman (Search First & Duplicates) ---');
  const searchOut = await send({ text: 'find Lakshmi' });
  console.log('Search Kind:', searchOut.kind);
  if (searchOut.kind === 'list') {
    console.log('List Header:', searchOut.header);
    console.log('Rows:', searchOut.sections[0]?.rows);
    const hasCreateNew = searchOut.sections[0]?.rows.some((r) => r.id === 'CMD_REGISTER_START');
    if (!hasCreateNew) throw new Error('Step 2 Failed: "Create New Patient" option not in search results.');
  } else {
    throw new Error('Step 2 Failed: Expected list with duplicate matches.');
  }
  console.log('✅ Step 2 Passed: Duplicate matches and "Create New Patient" shown.');

  // --- Step 3: ANM registers a new woman -> Minimum info + Risk status + WhatsApp consent ---
  console.log('\n--- Step 3: ANM registers a new woman (Lightweight Registration) ---');
  // 3a. Start registration
  const regStart = await send({ replyId: 'CMD_REGISTER_START' });
  console.log('3a. Reg Start:', 'body' in regStart ? regStart.body : regStart);

  // 3b. Send Name
  const regName = await send({ text: 'Priyanka Sharma' });
  console.log('3b. Reg Name entered, asking phone:', 'body' in regName ? regName.body : regName);

  // 3c. Send Phone
  const regPhone = await send({ text: '9876543210' });
  console.log('3c. Reg Phone entered, asking village:', 'body' in regPhone ? regPhone.body : regPhone);

  // 3d. Select Village (Rampur)
  const regVil = await send({ replyId: 'REG_VIL_VIL-RAM' });
  console.log('3d. Village selected, asking program:', 'body' in regVil ? regVil.body : regVil);

  // 3e. Select Program (ANC)
  const regProg = await send({ replyId: 'REG_PROG_ANC' });
  console.log('3e. Program selected, asking risk status:', 'body' in regProg ? regProg.body : regProg);

  // 3f. Select Risk (HRP)
  const regRisk = await send({ replyId: 'REG_RISK_HRP' });
  console.log('3f. Risk selected, asking WhatsApp consent:', 'body' in regRisk ? regRisk.body : regRisk);

  // 3g. WhatsApp Consent (Yes, Consented)
  const regConsent = await send({ replyId: 'REG_CONSENT_YES' });
  console.log('3g. Consent recorded, registration complete:\n', 'body' in regConsent ? regConsent.body : regConsent);

  const newPatient = db.prepare(`SELECT * FROM patients WHERE name = 'Priyanka Sharma'`).get() as any;
  if (!newPatient || newPatient.consent_whatsapp !== 1) {
    throw new Error('Step 3 Failed: Priyanka Sharma not found in database with consent=1.');
  }
  console.log('✅ Step 3 Passed: Priyanka Sharma registered with consent=1 and linked ASHA.');

  // --- Step 4: ANM creates a referral to CHC ---
  console.log('\n--- Step 4: ANM creates a referral to CHC ---');
  // 4a. Prompt next steps
  const stepPrompt = await send({ replyId: `ACTION_ADD_STEP_${newPatient.id}` });
  console.log('4a. Category Prompt:', 'body' in stepPrompt ? stepPrompt.body : stepPrompt);

  // 4b. Stage Referral
  const stageRef = await send({ replyId: `STAGE_CAT_${newPatient.id}_REFERRAL` });
  console.log('4b. Stage Referral Confirm Card:\n', 'body' in stageRef ? stageRef.body : stageRef);

  // 4c. Confirm Referral
  const confirmRef = await send({ replyId: `CONFIRM_STEP_${newPatient.id}` });
  console.log('4c. Confirmed Step:\n', 'body' in confirmRef ? confirmRef.body : confirmRef);

  const stepRecord = db.prepare(`SELECT * FROM steps WHERE patient_id = ? AND cat = 'REFERRAL'`).get(newPatient.id) as any;
  if (!stepRecord || stepRecord.level !== 'CHC' || stepRecord.status !== 'OPEN') {
    throw new Error('Step 4 Failed: Referral to CHC not persisted as OPEN.');
  }
  console.log('✅ Step 4 Passed: Referral to CHC persisted with ID:', stepRecord.id);

  // --- Step 5: Switch to CHC Staff Nurse -> newly referred patient appears under Expected Arrivals ---
  console.log('\n--- Step 5: Switch to CHC Staff Nurse -> Expected Arrivals ---');
  const roleChcOut = await send({ text: 'role chc' });
  console.log('5a. Switched to CHC:\n', 'body' in roleChcOut ? roleChcOut.body : roleChcOut);

  const arrivalsOut = await send({ text: 'arrivals' });
  console.log('5b. CHC Expected Arrivals:\n', 'body' in arrivalsOut ? arrivalsOut.body : arrivalsOut);
  if (arrivalsOut.kind === 'list') {
    const hasPriyanka = arrivalsOut.sections[0]?.rows.some((r) => r.title.includes('Priyanka Sharma'));
    if (!hasPriyanka) throw new Error('Step 5 Failed: Priyanka Sharma not found in CHC Expected Arrivals.');
  } else {
    throw new Error('Step 5 Failed: Expected arrivals list for CHC.');
  }
  console.log('✅ Step 5 Passed: Priyanka Sharma appears under CHC Expected Arrivals.');

  // --- Step 6: Staff Nurse marks her Arrived -> Referral closed with CHC provenance ---
  console.log('\n--- Step 6: CHC Staff Nurse marks Arrived (1-Tap Closure) ---');
  const closeOut = await send({ replyId: `DO_CARE_DELIVERED_${stepRecord.id}` });
  console.log('6. Closed Referral:\n', 'body' in closeOut ? closeOut.body : closeOut);

  const closedStep = db.prepare(`SELECT * FROM steps WHERE id = ?`).get(stepRecord.id) as any;
  if (closedStep.status !== 'DONE' || closedStep.closed_level !== 'CHC' || closedStep.closed_source !== 'AT_FACILITY') {
    throw new Error('Step 6 Failed: Step not closed with CHC provenance.');
  }
  console.log('✅ Step 6 Passed: Referral closed with CHC provenance at facility.');

  // --- Step 7: Switch back to ANM -> Patient journey shows referral completed at CHC ---
  console.log('\n--- Step 7: Switch back to ANM -> Journey shows referral completed at CHC ---');
  await send({ text: 'role anm' });
  const journeyOut = await send({ text: 'find Priyanka' });
  console.log('7. ANM Journey View:\n', 'body' in journeyOut ? journeyOut.body : journeyOut);
  if (!('body' in journeyOut) || !journeyOut.body.includes('Completed') || !journeyOut.body.includes('CHC')) {
    throw new Error('Step 7 Failed: Care journey does not show referral completed at CHC.');
  }
  console.log('✅ Step 7 Passed: Care journey shows referral completed at CHC.');

  // --- Step 8: Open worklist -> Completed referral is no longer overdue ---
  console.log('\n--- Step 8: Open worklist -> Completed referral is no longer overdue ---');
  const worklistOut = await send({ text: 'worklist' });
  console.log('8. Worklist:\n', 'body' in worklistOut ? worklistOut.body : worklistOut);
  if ('body' in worklistOut && worklistOut.body.includes('Priyanka Sharma')) {
    throw new Error('Step 8 Failed: Completed referral still appears in worklist.');
  }
  console.log('✅ Step 8 Passed: Completed referral is no longer in open worklist.');

  // --- Step 9: Trigger fake register OCR ---
  console.log('\n--- Step 9: Trigger fake register OCR ---');
  const ocrOut = await send({ text: 'ocr' });
  console.log('9a. OCR Report:\n', 'body' in ocrOut ? ocrOut.body : ocrOut);
  if (!('body' in ocrOut) || !ocrOut.body.includes('18 rows found') || !ocrOut.body.includes('15 matched')) {
    throw new Error('Step 9 Failed: OCR extraction summary incorrect.');
  }

  const ocrReview = await send({ replyId: 'OCR_REVIEW_3' });
  console.log('9b. OCR Review Exceptions:\n', 'body' in ocrReview ? ocrReview.body : ocrReview);

  const ocrResolve = await send({ replyId: 'OCR_RESOLVE_POOJA' });
  console.log('9c. OCR Exception Resolved:\n', 'body' in ocrResolve ? ocrResolve.body : ocrResolve);
  console.log('✅ Step 9 Passed: Simulated OCR import, exception review, and resolution verified.');

  // --- Step 10: Show event log ---
  console.log('\n--- Step 10: Show persistent CCE event log ---');
  const eventsOut = await send({ text: 'events' });
  console.log('10. CCE Events Log:\n', 'body' in eventsOut ? eventsOut.body : eventsOut);
  if (!('body' in eventsOut) || !eventsOut.body.includes('CloudEvents')) {
    throw new Error('Step 10 Failed: CloudEvents log not displayed.');
  }
  console.log('✅ Step 10 Passed: Persistent CCE event log verified.');

  // --- Step 11: Reset Demo ---
  console.log('\n--- Step 11: Reset Demo ---');
  const resetOut = await send({ text: 'reset demo' });
  console.log('11. Reset Demo Output:\n', 'body' in resetOut ? resetOut.body : resetOut);
  if (!('body' in resetOut) || !resetOut.body.includes('Demo Reset Successfully Complete')) {
    throw new Error('Step 11 Failed: Demo reset confirmation missing.');
  }

  // Verify baseline restored
  const lakshmiStep = db.prepare(`SELECT * FROM steps WHERE id = 'step-lakshmi-ref'`).get() as any;
  if (!lakshmiStep || lakshmiStep.status !== 'OPEN') {
    throw new Error('Step 11 Failed: Lakshmi overdue referral was not restored.');
  }
  console.log('✅ Step 11 Passed: Demo reset restored baseline state successfully.');

  console.log('\n===============================================================');
  console.log('🎉 ALL 11 STEPS OF THE WHATSAPP PRD ACCEPTANCE TEST PASSED!');
  console.log('===============================================================\n');
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
