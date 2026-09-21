import { getDb, Collections } from './firestore.js';
import type { CareStep } from './types.js';

export async function getOpenSteps(patientId: string): Promise<CareStep[]> {
  const snap = await getDb()
    .collection(Collections.careSteps)
    .where('patientId', '==', patientId)
    .where('status', '==', 'OPEN')
    .get();
  return snap.docs.map((doc) => doc.data() as CareStep);
}

export async function getStepById(stepId: string): Promise<CareStep | null> {
  const doc = await getDb().collection(Collections.careSteps).doc(stepId).get();
  return doc.exists ? (doc.data() as CareStep) : null;
}

/** Every step (open and closed) for the patient journey view (addendum §4). */
export async function getAllStepsForPatient(patientId: string): Promise<CareStep[]> {
  const snap = await getDb().collection(Collections.careSteps).where('patientId', '==', patientId).get();
  return snap.docs.map((doc) => doc.data() as CareStep);
}
