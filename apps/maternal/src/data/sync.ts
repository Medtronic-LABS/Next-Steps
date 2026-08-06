// Outbox replay. Every offline write lands in Dexie's `outbox` table keyed by a
// client-generated id; on reconnect we drain it to Firestore idempotently. When
// Firebase is not configured this is a durable no-op — the queue simply persists.
import { db, getMeta, setMeta } from './db';
import { isFirebaseConfigured, getFirebaseApp } from '../firebase/config';
import type { OutboxEntry } from '../domain/types';

const LAST_SYNCED = 'lastSynced';

export async function getLastSynced(): Promise<number | undefined> {
  return getMeta<number>(LAST_SYNCED);
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where('synced').equals(0 as never).count().catch(() => 0);
}

/**
 * Drain unsynced outbox entries to Firestore. Returns the number replayed.
 * Safe to call repeatedly; entries are marked synced only after a successful push.
 */
export async function drainOutbox(nowMs: number): Promise<number> {
  const pending = (await db.outbox.toArray()).filter((e) => !e.synced);
  if (!isFirebaseConfigured()) {
    // Standalone mode: leave the queue intact, just record the attempt.
    await setMeta(LAST_SYNCED, nowMs);
    return 0;
  }
  const app = getFirebaseApp()!;
  const { getFirestore } = await import('firebase/firestore');
  const fs = getFirestore(app);

  let replayed = 0;
  for (const entry of pending) {
    try {
      await pushEntry(fs, entry);
      await db.outbox.update(entry.id, { synced: true });
      replayed++;
    } catch (err) {
      console.warn('[sync] entry failed, will retry:', entry.id, err);
      break; // preserve order; retry on next drain
    }
  }
  await setMeta(LAST_SYNCED, nowMs);
  return replayed;
}

// Maps an outbox op to a Firestore write. Kept intentionally small — the real
// fan-out (reminders, escalations, referral routing) happens in Cloud Functions.
async function pushEntry(fs: unknown, entry: OutboxEntry): Promise<void> {
  const { doc, setDoc, updateDoc } = await import('firebase/firestore');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = fs as any;
  const p = entry.payload as Record<string, unknown>;
  switch (entry.op) {
    case 'register':
      await setDoc(doc(store, 'women', p.id as string), p);
      break;
    case 'addSteps': {
      const womanId = p.womanId as string;
      const steps = p.steps as { id: string }[];
      for (const step of steps) {
        await setDoc(doc(store, 'women', womanId, 'steps', step.id), step);
      }
      break;
    }
    case 'closeStep':
      await updateDoc(doc(store, 'women', p.womanId as string, 'steps', p.stepId as string), {
        status: p.status, outcome: p.outcome, closedAt: p.cdate, closedSource: p.csrc, closedBy: p.cby,
      });
      break;
    case 'ackAlert':
      await setDoc(doc(store, 'alerts', p.stepId as string), { ackAt: p.at, ackBy: p.by }, { merge: true } as never);
      break;
  }
}
