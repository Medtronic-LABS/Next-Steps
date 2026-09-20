import { randomUUID } from 'node:crypto';
import type { Transaction } from 'firebase-admin/firestore';
import { getDb, Collections } from './firestore.js';
import { getCCEClient } from '../adapter/CCEClient.js';
import type { CceOutboxEvent } from './types.js';

/** After this many failed attempts, an event stops retrying and is marked FAILED (spec §17-style retry/status tracking). */
const MAX_ATTEMPTS = 5;

/**
 * Writes a CCE outbox entry as part of the caller's transaction (spec §14).
 * Duplicate delivery is prevented upstream by the webhook's message-id dedupe
 * (spec §15), not by a deterministic id here — see docs/whatsapp/firestore-model.md.
 */
export function createCCEEvent(
  tx: Transaction,
  payload: Record<string, unknown>,
): CceOutboxEvent {
  const now = new Date().toISOString();
  const event: CceOutboxEvent = {
    id: randomUUID(),
    status: 'PENDING',
    payload,
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  tx.set(getDb().collection(Collections.cceOutbox).doc(event.id), event);
  return event;
}

async function getPendingEvents(): Promise<CceOutboxEvent[]> {
  const snap = await getDb().collection(Collections.cceOutbox).where('status', '==', 'PENDING').get();
  return snap.docs.map((doc) => doc.data() as CceOutboxEvent);
}

/**
 * Background consumer (spec §14): drains PENDING cceOutbox events, sending
 * each exactly once per attempt via CCEClient. A failed send is left PENDING
 * (so the next scheduled run retries it) until MAX_ATTEMPTS is reached, at
 * which point it's marked FAILED and stops retrying automatically.
 */
export async function drainCCEOutbox(): Promise<{ sent: number; failed: number }> {
  const client = getCCEClient();
  const events = await getPendingEvents();

  let sent = 0;
  let failed = 0;

  for (const event of events) {
    const ref = getDb().collection(Collections.cceOutbox).doc(event.id);
    try {
      await client.send(event.payload);
      await ref.update({ status: 'SENT', updatedAt: new Date().toISOString() });
      sent++;
    } catch (err) {
      const attempts = event.attempts + 1;
      const lastError = err instanceof Error ? err.message : String(err);
      const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
      await ref.update({ status, attempts, lastError, updatedAt: new Date().toISOString() });
      failed++;
    }
  }

  return { sent, failed };
}
