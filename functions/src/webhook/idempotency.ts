import { getDb, Collections } from '../domain/firestore.js';

/**
 * Atomically claims a WhatsApp message id (spec §15/§18). Returns true if this
 * message was already processed (caller must skip domain execution but still
 * ack 200), false if this call just claimed it (caller should proceed).
 */
export async function claimMessageId(whatsappMessageId: string): Promise<boolean> {
  const ref = getDb().collection(Collections.whatsappMessages).doc(whatsappMessageId);
  return getDb().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) return true;
    tx.set(ref, { id: whatsappMessageId, processedAt: new Date().toISOString(), status: 'RECEIVED' });
    return false;
  });
}

export async function recordMessageStatus(
  whatsappMessageId: string,
  status: string,
): Promise<void> {
  await getDb()
    .collection(Collections.whatsappMessages)
    .doc(whatsappMessageId)
    .set({ id: whatsappMessageId, lastStatus: status, lastStatusAt: new Date().toISOString() }, { merge: true });
}
