import { getDb, Collections } from './firestore.js';
import type { Patient } from './types.js';

/**
 * Substring, case-insensitive search over the synthetic patient set. The
 * fixture set is tiny, so an in-memory filter over all patients is simpler and
 * more predictable than trying to emulate substring search in Firestore.
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const snap = await getDb().collection(Collections.patients).get();
  return snap.docs
    .map((doc) => doc.data() as Patient)
    .filter((patient) => patient.displayName.toLowerCase().includes(trimmed));
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const doc = await getDb().collection(Collections.patients).doc(patientId).get();
  return doc.exists ? (doc.data() as Patient) : null;
}
