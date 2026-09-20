import { getDb, Collections } from './firestore.js';
import type { User } from './types.js';

/**
 * Resolves a WhatsApp sender's phone number to a seeded Firebase user (spec §11).
 * Unknown or inactive numbers resolve to null — callers must treat that as
 * "not registered for this service" and reveal no patient information.
 */
export async function resolveUser(phoneNumber: string): Promise<User | null> {
  const snap = await getDb()
    .collection(Collections.users)
    .where('phoneNumber', '==', phoneNumber)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const user = snap.docs[0]!.data() as User;
  if (user.status !== 'ACTIVE') return null;

  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  const doc = await getDb().collection(Collections.users).doc(userId).get();
  return doc.exists ? (doc.data() as User) : null;
}
