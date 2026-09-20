import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { getDb, Collections } from '../../src/domain/firestore.js';
import { drainCCEOutbox } from '../../src/domain/CCEOutboxService.js';
import { getCCEClient, MockCCEClient } from '../../src/adapter/CCEClient.js';
import type { CceOutboxEvent } from '../../src/domain/types.js';

async function seedEvent(overrides: Partial<CceOutboxEvent> = {}): Promise<CceOutboxEvent> {
  const now = new Date().toISOString();
  const event: CceOutboxEvent = {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    status: 'PENDING',
    payload: { eventType: 'REFERRAL_CONFIRMED', stepId: 'step-1' },
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await getDb().collection(Collections.cceOutbox).doc(event.id).set(event);
  return event;
}

describe('CCEOutboxService.drainCCEOutbox', () => {
  beforeEach(async () => {
    await clearFirestore();
    const client = getCCEClient();
    if (client instanceof MockCCEClient) client.reset();
  });

  it('sends a PENDING event and marks it SENT', async () => {
    const event = await seedEvent();

    const result = await drainCCEOutbox();
    expect(result).toEqual({ sent: 1, failed: 0 });

    const doc = await getDb().collection(Collections.cceOutbox).doc(event.id).get();
    expect(doc.data()!.status).toBe('SENT');

    const client = getCCEClient() as MockCCEClient;
    expect(client.sent).toEqual([event.payload]);
  });

  it('never re-sends an already-SENT event', async () => {
    await seedEvent({ status: 'SENT' });

    const result = await drainCCEOutbox();
    expect(result).toEqual({ sent: 0, failed: 0 });

    const client = getCCEClient() as MockCCEClient;
    expect(client.sent).toEqual([]);
  });

  it('leaves a failed send PENDING for retry until MAX_ATTEMPTS, then marks it FAILED', async () => {
    const originalFetch = global.fetch;
    process.env.CCE_ENDPOINT_URL = 'https://cce.example.test/events';
    process.env.CCE_API_KEY = 'test-key';
    global.fetch = (async () =>
      ({ ok: false, status: 500, text: async () => 'boom' }) as unknown as Response) as typeof fetch;

    try {
      const event = await seedEvent({ attempts: 4 }); // one more failure hits MAX_ATTEMPTS (5)

      const result = await drainCCEOutbox();
      expect(result).toEqual({ sent: 0, failed: 1 });

      const doc = await getDb().collection(Collections.cceOutbox).doc(event.id).get();
      const data = doc.data()!;
      expect(data.status).toBe('FAILED');
      expect(data.attempts).toBe(5);
      expect(data.lastError).toContain('boom');
    } finally {
      global.fetch = originalFetch;
      delete process.env.CCE_ENDPOINT_URL;
      delete process.env.CCE_API_KEY;
    }
  });
});
