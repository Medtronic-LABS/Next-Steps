import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore | undefined;

/**
 * Lazily initializes the Admin SDK. Safe to call repeatedly (Cloud Functions
 * cold-start reuse, and unit tests against the Firestore emulator via
 * FIRESTORE_EMULATOR_HOST).
 */
export function getDb(): Firestore {
  if (!db) {
    if (getApps().length === 0) {
      initializeApp();
    }
    db = getFirestore();
  }
  return db;
}

export const Collections = {
  users: 'users',
  facilities: 'facilities',
  patients: 'patients',
  careSteps: 'careSteps',
  conversations: 'conversations',
  auditEvents: 'auditEvents',
  cceOutbox: 'cceOutbox',
  whatsappMessages: 'whatsappMessages',
  alerts: 'alerts',
} as const;
