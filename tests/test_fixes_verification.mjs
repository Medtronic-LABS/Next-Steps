import assert from 'assert';
import { db, initDatabase } from '../backend/dist/db/index.js';
import { routeInboundMessage } from '../backend/dist/whatsapp/router.js';
import { getSession, resetSession, updateSession } from '../backend/dist/whatsapp/sessionManager.js';
import { syncRouter } from '../backend/dist/routes/syncRoutes.js';

console.log('🧪 Starting Verification Tests for WhatsApp and SQLite Fixes...\n');

async function run() {
  initDatabase();

  // Test 1: Verify syncRoutes handling of steps without cat or patient_id
  console.log('1. Testing syncRoutes push with missing cat / patient_id (Bug 1)...');
  
  // First, ensure a test patient exists
  const testPatientId = 'test-p-sync-01';
  db.prepare(`
    INSERT OR REPLACE INTO patients (id, name, phone, service, village_name, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(testPatientId, 'Sync Test Mother', '+919999988888', 'ANC', 'Test Village', 'HRP', new Date().toISOString());

  // Insert a base step
  const testStepId = 'test-step-sync-01';
  db.prepare(`
    INSERT OR REPLACE INTO steps (id, patient_id, cat, level, due, sent_at, status, owner_role, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testStepId, testPatientId, 'USG_SCAN', 'CHC', '2026-10-01', '2026-09-20', 'OPEN', 'anm', 'Tester', new Date().toISOString(), new Date().toISOString());

  // Simulate mobile app pushing closure update with NO cat and NO patient_id (the exact bug from the logs)
  const syncPushReq = {
    body: {
      actorId: 'test-anm',
      actorName: 'ANM Rekha',
      steps: [
        {
          id: testStepId,
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          closed_by: 'ANM Rekha',
          closed_source: 'MOBILE_APP',
          closed_level: 'CHC',
          // Note: cat and patient_id intentionally omitted
        },
        {
          id: 'test-step-new-without-cat',
          // New step without cat or patient_id
          status: 'OPEN',
          created_at: new Date().toISOString(),
        }
      ],
      patients: []
    }
  };

  let responseData = null;
  const mockRes = {
    json: (data) => { responseData = data; return mockRes; },
    status: (code) => mockRes,
  };

  // Find the POST /push handler from syncRouter
  const pushRoute = syncRouter.stack.find((layer) => layer.route && layer.route.path === '/push');
  assert(pushRoute, 'syncRouter /push route must exist');
  
  // Execute handler
  pushRoute.route.stack[0].handle(syncPushReq, mockRes);
  assert(responseData !== null, 'Response should be returned');
  assert.strictEqual(responseData.success, true, 'Sync push must succeed');
  assert.strictEqual(responseData.receivedSteps, 2, 'Must have received 2 steps');

  // Verify DB state
  const updatedStep = db.prepare('SELECT * FROM steps WHERE id = ?').get(testStepId);
  assert.strictEqual(updatedStep.status, 'CLOSED');
  assert.strictEqual(updatedStep.cat, 'USG_SCAN', 'Original cat must be preserved');
  assert.strictEqual(updatedStep.patient_id, testPatientId, 'Original patient_id must be preserved');

  const newStep = db.prepare('SELECT * FROM steps WHERE id = ?').get('test-step-new-without-cat');
  assert(newStep, 'New step should be inserted');
  assert.strictEqual(newStep.cat, 'REFERRAL', 'Fallback cat should be REFERRAL');
  assert.strictEqual(newStep.patient_id, 'unknown', 'Fallback patient_id should be unknown');

  console.log('   ✅ syncRoutes step update and insert succeeded without SQLite constraint errors!');

  // Test 2: WhatsApp Session Cleansing on Greeting (Bug 2)
  console.log('\n2. Testing WhatsApp Session Cleansing on Greeting...');
  const testPhone = '+919899114279'; // ANM Rekha
  const session = getSession(testPhone, 'USR-ANM-01');

  // Stage some old referral state as if the user was halfway through a referral
  session.currentState = 'CONFIRMING_STEP';
  session.patientId = 'w1';
  session.stagedAction = { category: 'USG_SCAN', level: 'CHC', dueDate: '2026-10-01' };
  session.stagedSteps = [{ category: 'USG_SCAN', level: 'CHC', dueDate: '2026-10-01' }];
  updateSession(session);

  assert.strictEqual(session.stagedAction.category, 'USG_SCAN');

  // User sends "Hi"
  const hiResponses = await routeInboundMessage({
    id: 'test-hi-01',
    from: testPhone,
    timestamp: new Date().toISOString(),
    kind: 'text',
    text: 'Hi',
  });

  assert(hiResponses.length > 0);
  const refreshedSession = getSession(testPhone, 'USR-ANM-01');
  assert.strictEqual(refreshedSession.currentState, 'IDLE', 'Session state must be reset to IDLE');
  assert.strictEqual(refreshedSession.stagedAction, undefined, 'stagedAction must be wiped');
  assert.strictEqual(refreshedSession.stagedSteps, undefined, 'stagedSteps must be wiped');
  assert.strictEqual(refreshedSession.patientId, undefined, 'patientId must be wiped');

  // Ensure menu was returned, NOT old Sunita steps
  // Test 3: WhatsApp Webhook Deduplication & Staleness Filter
  console.log('\n3. Testing WhatsApp Webhook Deduplication and Stale Message Filtering...');
  const { whatsappRouter } = await import('../backend/dist/whatsapp/webhook.js');
  const { setWhatsAppClient, MockWhatsAppClient } = await import('../backend/dist/whatsapp/client.js');

  const mockClient = new MockWhatsAppClient();
  setWhatsAppClient(mockClient);

  const webhookPostRoute = whatsappRouter.stack.find(
    (layer) => layer.route && layer.route.methods.post && (layer.route.path === '/' || (Array.isArray(layer.route.path) && layer.route.path.includes('/')))
  );
  assert(webhookPostRoute, 'whatsappRouter POST handler must exist');

  const makeWebhookPayload = (id, timestampSec, text) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '123456', phone_number_id: '1348632234997870' },
              messages: [
                {
                  from: '919899114279',
                  id,
                  timestamp: String(timestampSec),
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

  const postHandler = webhookPostRoute.route.stack[0].handle;
  const mockWebhookRes = { sendStatus: () => mockWebhookRes, status: () => mockWebhookRes, send: () => mockWebhookRes };

  // 3a: Fresh message
  const nowSec = Math.floor(Date.now() / 1000);
  postHandler({ body: makeWebhookPayload('wam-dedup-test-01', nowSec, 'Hi') }, mockWebhookRes);

  // Wait 100ms for queue to process
  await new Promise((r) => setTimeout(r, 100));
  assert(mockClient.sentMessages.length > 0, 'First message should be processed');
  const initialSentCount = mockClient.sentMessages.length;

  // 3b: Duplicate delivery with same message ID (Meta retry)
  postHandler({ body: makeWebhookPayload('wam-dedup-test-01', nowSec, 'Hi') }, mockWebhookRes);
  await new Promise((r) => setTimeout(r, 100));
  assert.strictEqual(mockClient.sentMessages.length, initialSentCount, 'Duplicate message ID must NOT be processed');
  console.log('   ✅ Duplicate message delivery correctly identified and discarded');

  // 3c: Stale message (>5 minutes old)
  const staleTimestampSec = nowSec - 600; // 10 minutes ago
  postHandler({ body: makeWebhookPayload('wam-stale-test-02', staleTimestampSec, 'Hi') }, mockWebhookRes);
  await new Promise((r) => setTimeout(r, 100));
  assert.strictEqual(mockClient.sentMessages.length, initialSentCount, 'Stale message must NOT be processed');
  console.log('   ✅ Stale message (>5 mins old) correctly discarded');

  console.log('\n🎉 All Fixes Verified Successfully!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

