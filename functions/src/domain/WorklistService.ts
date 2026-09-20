import { getDb, Collections } from './firestore.js';
import type { CareStep } from './types.js';

export interface WorklistSummary {
  overdue: CareStep[];
  dueToday: CareStep[];
  upcoming: CareStep[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getOpenStepsForOwner(ownerUserId: string): Promise<CareStep[]> {
  const snap = await getDb()
    .collection(Collections.careSteps)
    .where('ownerUserId', '==', ownerUserId)
    .where('status', '==', 'OPEN')
    .get();
  return snap.docs.map((doc) => doc.data() as CareStep);
}

/** Today's work + overdue drill-down (spec MVP §1). ISO dates sort lexically. */
export async function getWorklistSummary(ownerUserId: string): Promise<WorklistSummary> {
  const today = todayIso();
  const steps = await getOpenStepsForOwner(ownerUserId);

  const overdue = steps.filter((s) => s.dueDate < today);
  const dueToday = steps.filter((s) => s.dueDate === today);
  const upcoming = steps.filter((s) => s.dueDate > today);

  return { overdue, dueToday, upcoming };
}

export async function getOverdueSteps(ownerUserId: string): Promise<CareStep[]> {
  const { overdue } = await getWorklistSummary(ownerUserId);
  return overdue;
}
