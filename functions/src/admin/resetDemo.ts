import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getDb, Collections } from '../domain/firestore.js';
import { loadFixtures } from '../fixtures/loadFixtures.js';
import { resetDemoToken } from '../config/secrets.js';

/**
 * Reset Demo (addendum §14) — deliberately outside the simulated frontline
 * WhatsApp experience (own HTTPS endpoint, not a menu command), since it's
 * meant to be run between demos, not by a frontline worker mid-conversation.
 * Wipes every collection this backend writes to and reseeds the frozen
 * synthetic fixtures (Anita/Priya/Lakshmi + optionally Ramesh).
 */
async function deleteAllDocs(collectionName: string): Promise<number> {
  const db = getDb();
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return 0;

  const batches: FirebaseFirestore.WriteBatch[] = [];
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      batches.push(batch);
      batch = db.batch();
    }
  }
  batches.push(batch);
  await Promise.all(batches.map((b) => b.commit()));
  return snap.size;
}

export const resetDemo = onRequest({ secrets: [resetDemoToken] }, async (req, res) => {
  const expected = process.env.RESET_DEMO_TOKEN;
  const provided = req.get('x-reset-token') ?? req.query['token'];
  if (!expected || provided !== expected) {
    res.sendStatus(403);
    return;
  }

  const withHypertensionCohort = req.query['hypertension'] === 'true';

  const wiped: Record<string, number> = {};
  for (const collectionName of [
    Collections.patients,
    Collections.careSteps,
    Collections.conversations,
    Collections.auditEvents,
    Collections.cceOutbox,
    Collections.alerts,
    Collections.whatsappMessages,
  ]) {
    wiped[collectionName] = await deleteAllDocs(collectionName);
  }
  // Facilities and users are demo-static; reseeded (upserted) rather than
  // wiped, in case a caller ever edits them via the console between demos.
  await loadFixtures({ withHypertensionCohort });

  logger.info('resetDemo: wiped and reseeded', { wiped, withHypertensionCohort });
  res.status(200).json({ ok: true, wiped, withHypertensionCohort });
});
