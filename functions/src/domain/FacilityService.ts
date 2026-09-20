import { getDb, Collections } from './firestore.js';
import type { Facility } from './types.js';

export async function getFacilityById(facilityId: string): Promise<Facility | null> {
  const doc = await getDb().collection(Collections.facilities).doc(facilityId).get();
  return doc.exists ? (doc.data() as Facility) : null;
}

export async function listFacilities(): Promise<Facility[]> {
  const snap = await getDb().collection(Collections.facilities).get();
  return snap.docs.map((doc) => doc.data() as Facility);
}
