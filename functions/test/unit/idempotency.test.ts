import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { claimMessageId, recordMessageStatus } from '../../src/webhook/idempotency.js';
import { getDb, Collections } from '../../src/domain/firestore.js';

describe('claimMessageId', () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it('claims a new message id and reports later claims as duplicates (spec §15/§18)', async () => {
    const first = await claimMessageId('wamid.ABC123');
    expect(first).toBe(false); // not a duplicate — proceed

    const second = await claimMessageId('wamid.ABC123');
    expect(second).toBe(true); // duplicate — caller must skip domain execution

    const different = await claimMessageId('wamid.XYZ789');
    expect(different).toBe(false);
  });
});

describe('recordMessageStatus', () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it('merges a delivery status update without clobbering an existing claim record (spec §18 delivery failure)', async () => {
    await claimMessageId('wamid.ABC123');
    await recordMessageStatus('wamid.ABC123', 'delivered');

    const doc = await getDb().collection(Collections.whatsappMessages).doc('wamid.ABC123').get();
    const data = doc.data()!;
    expect(data.status).toBe('RECEIVED');
    expect(data.processedAt).toBeDefined();
    expect(data.lastStatus).toBe('delivered');

    // A duplicate delivery of the same message must still be recognized as a duplicate.
    expect(await claimMessageId('wamid.ABC123')).toBe(true);
  });

  it('records a status for a message id with no prior claim (a pure status-only webhook call)', async () => {
    await recordMessageStatus('wamid.NEVER-CLAIMED', 'failed');
    const doc = await getDb().collection(Collections.whatsappMessages).doc('wamid.NEVER-CLAIMED').get();
    expect(doc.data()!.lastStatus).toBe('failed');
  });
});
