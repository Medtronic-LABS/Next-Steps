import { randomUUID } from 'node:crypto';
import type { Transaction } from 'firebase-admin/firestore';
import { getDb, Collections } from './firestore.js';
import type { CceOutboxEvent } from './types.js';

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
