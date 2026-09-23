import assert from 'assert';
import { db } from '../backend/dist/db/index.js';
import { routeInboundMessage } from '../backend/dist/whatsapp/router.js';
import { getSession, resetSession } from '../backend/dist/whatsapp/sessionManager.js';
import { whatsappRouter } from '../backend/dist/whatsapp/webhook.js';
import { setWhatsAppClient, MockWhatsAppClient } from '../backend/dist/whatsapp/client.js';

async function testConcurrencyAndBilingual() {
  console.log('🧪 Starting Concurrency & Bilingual WhatsApp Bot Tests...\n');

  // Set up mock WhatsApp client
  const mockClient = new MockWhatsAppClient();
  setWhatsAppClient(mockClient);

  const phoneANM = '+919899114279';   // ANM Rekha (Sub-centre Ghurehta)
  const phoneCHC = '+919899114278';   // Priya (CHC Teonthar)
  const phonePHC = '+919899114277';   // PHC Nurse (PHC Sirmour)

  // Clear previous phone conflicts and link to standard seed users
  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET phone = '+9199999999' || rowid WHERE phone IN (?, ?, ?)`).run(phoneANM, phoneCHC, phonePHC);
  db.prepare(`UPDATE users SET phone = ? WHERE id = 'USR-ANM-01'`).run(phoneANM);
  db.prepare(`UPDATE users SET phone = ? WHERE id = 'USR-CHC-SN'`).run(phoneCHC);
  db.prepare(`UPDATE users SET phone = ? WHERE id = 'USR-PHC-SN'`).run(phonePHC);

  // =========================================================================
  // TEST 1: Simultaneous Multi-User Concurrency
  // =========================================================================
  console.log('1. Testing Concurrent Messages from Multiple Users at the Same Instant...');

  const webhookPostRoute = whatsappRouter.stack.find(
    (layer) => layer.route && layer.route.methods.post && (layer.route.path === '/' || (Array.isArray(layer.route.path) && layer.route.path.includes('/')))
  );
  assert(webhookPostRoute, 'whatsappRouter POST handler must exist');
  const postHandler = webhookPostRoute.route.stack[0].handle;
  const mockRes = { sendStatus: () => mockRes, status: () => mockRes, send: () => mockRes };

  const makePayload = (from, id, text) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_ACCOUNT',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '123456', phone_number_id: '1348632234997870' },
              messages: [
                {
                  from: from.replace('+', ''),
                  id,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: text },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  });

  mockClient.sentMessages = [];

  // Fire 3 simultaneous webhook POSTs from 3 distinct phone numbers at the exact same moment
  const p1 = postHandler({ body: makePayload(phoneANM, 'msg-conc-01', 'menu') }, mockRes);
  const p2 = postHandler({ body: makePayload(phoneCHC, 'msg-conc-02', 'arrivals') }, mockRes);
  const p3 = postHandler({ body: makePayload(phonePHC, 'msg-conc-03', 'worklist') }, mockRes);

  // Wait 300ms for all per-user async queues to finish
  await new Promise((resolve) => setTimeout(resolve, 350));

  // Verify all 3 users received outbound messages
  const anmMessages = mockClient.sentMessages.filter((m) => m.to.includes('9899114279'));
  const chcMessages = mockClient.sentMessages.filter((m) => m.to.includes('9899114278'));
  const phcMessages = mockClient.sentMessages.filter((m) => m.to.includes('9899114277'));

  assert(anmMessages.length > 0, 'ANM Rekha must receive outbound response');
  assert(chcMessages.length > 0, 'CHC Priya must receive outbound response');
  assert(phcMessages.length > 0, 'PHC Sneha must receive outbound response');

  console.log(`   ✅ Concurrent delivery succeeded: ANM (${anmMessages.length} msgs), CHC (${chcMessages.length} msgs), PHC (${phcMessages.length} msgs)`);

  // Verify independent session states didn't cross-contaminate
  const sessionANM = getSession(phoneANM, 'USR-ANM-01');
  const sessionCHC = getSession(phoneCHC, 'USR-CHC-01');
  const sessionPHC = getSession(phonePHC, 'USR-PHC-01');

  assert.strictEqual(sessionANM.userId, 'USR-ANM-01', 'ANM session user preserved');
  assert.strictEqual(sessionCHC.userId, 'USR-CHC-SN', 'CHC session user preserved');
  assert.strictEqual(sessionPHC.userId, 'USR-PHC-SN', 'PHC session user preserved');

  console.log('   ✅ Multi-user session isolation verified (zero cross-talk)');

  // =========================================================================
  // TEST 2: Bilingual Preference Selection and Persistence
  // =========================================================================
  console.log('\n2. Testing Bilingual Preferences and Language Switching...');

  // 2a: Request language selection
  const langPromptResp = await routeInboundMessage({
    id: 'msg-lang-01',
    from: phoneANM,
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'language',
  });
  assert(langPromptResp.length > 0);
  assert.strictEqual(langPromptResp[0].kind, 'buttons');
  assert(langPromptResp[0].buttons.some((b) => b.id === 'SET_LANG_EN'), 'English option available');
  assert(langPromptResp[0].buttons.some((b) => b.id === 'SET_LANG_HI'), 'Hindi option available');
  console.log('   ✅ Language selection options prompted successfully');

  // 2b: Switch to English via button SET_LANG_EN
  const enSwitchResp = await routeInboundMessage({
    id: 'msg-lang-02',
    from: phoneANM,
    timestamp: new Date().toISOString(),
    kind: 'interactive_button',
    replyId: 'SET_LANG_EN',
  });
  assert(enSwitchResp.length > 0);
  assert(enSwitchResp[0].body.includes('Language updated to English'), 'English confirmation message');

  // Verify database persistence
  const userEn = db.prepare('SELECT preferred_lang FROM users WHERE phone = ?').get(phoneANM);
  assert.strictEqual(userEn.preferred_lang, 'en', 'User preference in SQLite must be "en"');

  // Verify subsequent menu is in English
  const enMenuResp = await routeInboundMessage({
    id: 'msg-lang-03',
    from: phoneANM,
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'menu',
  });
  assert(enMenuResp.length > 0);
  assert(enMenuResp[0].body.includes('Welcome') || enMenuResp[0].body.includes('Next Steps'), 'English menu returned');
  assert(enMenuResp[0].buttons.some((b) => b.id === 'CMD_FIND_PATIENT' && b.title === 'Find Patient'), 'Button in English');
  console.log('   ✅ Switched to English: Persistent in SQLite and all UI menus rendered in English');

  // 2c: Verify Worklist in English
  const enWorklistResp = await routeInboundMessage({
    id: 'msg-lang-04',
    from: phoneANM,
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'worklist',
  });
  assert(enWorklistResp.length > 0);
  if (enWorklistResp[0].kind === 'list') {
    assert.strictEqual(enWorklistResp[0].buttonText, 'Select Patient');
  } else {
    assert(enWorklistResp[0].buttons.some((b) => b.id === 'CMD_FIND_PATIENT' && b.title === 'Find Patient'));
  }
  console.log('   ✅ Worklist correctly rendered in English');

  // 2d: Switch back to Hindi via text "hindi"
  const hiSwitchResp = await routeInboundMessage({
    id: 'msg-lang-05',
    from: phoneANM,
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'hindi',
  });
  assert(hiSwitchResp.length > 0);
  assert(hiSwitchResp[0].body.includes('भाषा बदलकर हिंदी कर दी गई है'), 'Hindi confirmation message');

  const userHi = db.prepare('SELECT preferred_lang FROM users WHERE phone = ?').get(phoneANM);
  assert.strictEqual(userHi.preferred_lang, 'hi', 'User preference in SQLite must be "hi"');

  // Verify subsequent menu is in Hindi
  const hiMenuResp = await routeInboundMessage({
    id: 'msg-lang-06',
    from: phoneANM,
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'menu',
  });
  assert(hiMenuResp.length > 0);
  assert(hiMenuResp[0].body.includes('नमस्ते'), 'Hindi menu returned');
  assert(hiMenuResp[0].buttons.some((b) => b.id === 'CMD_FIND_PATIENT' && b.title === 'मरीज़ खोजें'), 'Button in Hindi');
  console.log('   ✅ Switched back to Hindi: Persistent in SQLite and all UI menus rendered in Hindi');

  // =========================================================================
  // TEST 3: PHC Expected Arrivals Flow and Meta 20-Char Button Limit
  // =========================================================================
  console.log('\n3. Testing PHC Expected Arrivals Flow & Button Title Constraints (<= 20 chars)...');

  // Insert a test open referral step directed to PHC
  const testStepId = 'step-phc-test-99';
  db.prepare(`
    INSERT OR REPLACE INTO steps (id, patient_id, cat, level, due, sent_at, status, owner_role, created_by, created_at, updated_at)
    VALUES (?, 'w1', 'REFERRAL', 'PHC', '2026-10-01', '2026-09-23', 'OPEN', 'anm', 'ANM Rekha', ?, ?)
  `).run(testStepId, now, now);

  // PHC Nurse requests Expected Arrivals
  const phcArrivalsResp = await routeInboundMessage({
    id: 'msg-phc-01',
    from: phonePHC,
    timestamp: new Date().toISOString(),
    kind: 'interactive_button',
    replyId: 'CMD_ARRIVALS',
  });
  assert(phcArrivalsResp.length > 0);
  assert.strictEqual(phcArrivalsResp[0].kind, 'list');
  console.log('   ✅ PHC Expected Arrivals list returned with pending arrivals');

  // PHC Nurse taps the patient to record arrival
  const phcPickResp = await routeInboundMessage({
    id: 'msg-phc-02',
    from: phonePHC,
    timestamp: new Date().toISOString(),
    kind: 'interactive_list',
    replyId: `ARRIVE_PICK_${testStepId}`,
  });
  assert(phcPickResp.length > 0);
  assert.strictEqual(phcPickResp[0].kind, 'buttons');

  // CRITICAL CHECK: Every button title MUST be <= 20 characters for Meta WhatsApp API compliance
  for (const btn of phcPickResp[0].buttons) {
    assert(
      btn.title.length <= 20,
      `Button "${btn.title}" exceeds Meta 20-character limit! Length: ${btn.title.length}`
    );
  }
  console.log('   ✅ All button titles in Arrival Action strictly <= 20 characters');

  // Complete care delivery
  const phcCareResp = await routeInboundMessage({
    id: 'msg-phc-03',
    from: phonePHC,
    timestamp: new Date().toISOString(),
    kind: 'interactive_button',
    replyId: `DO_CARE_DELIVERED_${testStepId}`,
  });
  assert(phcCareResp.length > 0);
  assert(phcCareResp[0].body.includes('सफलतापूर्वक पूर्ण') || phcCareResp[0].body.includes('Closed Successfully'));

  // Verify step status in SQLite is 'DONE'
  const closedStep = db.prepare('SELECT status, closed_source, closed_level FROM steps WHERE id = ?').get(testStepId);
  assert.strictEqual(closedStep.status, 'DONE', 'Step status must be updated to DONE');
  assert.strictEqual(closedStep.closed_source, 'AT_FACILITY', 'closed_source must be AT_FACILITY');
  console.log('   ✅ Referral care delivery successfully confirmed and closed with full provenance');

  console.log('\n🎉 ALL CONCURRENCY AND BILINGUAL TESTS PASSED SUCCESSFULLY!');
}

testConcurrencyAndBilingual().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
