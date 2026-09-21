import { getAllStepsForPatient } from './CareStepService.js';
import { getPatientById } from './PatientService.js';
import { DomainError, type CareStep, type Patient } from './types.js';

export interface PatientJourney {
  patient: Patient;
  openSteps: CareStep[];
  overdueSteps: CareStep[];
  completedSteps: CareStep[];
  referrals: CareStep[];
  nextDueAction: CareStep | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Always regenerated from current persisted state (addendum §4) — no
 * caching, no derived snapshot stored anywhere; every read walks the
 * patient's full step history fresh.
 */
export async function getPatientJourney(patientId: string): Promise<PatientJourney> {
  const patient = await getPatientById(patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const allSteps = await getAllStepsForPatient(patientId);
  const today = todayIso();

  const openSteps = allSteps.filter((s) => s.status === 'OPEN');
  const overdueSteps = openSteps.filter((s) => s.dueDate < today);
  const completedSteps = allSteps
    .filter((s) => s.status === 'DONE')
    .sort((a, b) => (a.closedAt! < b.closedAt! ? 1 : -1));
  const referrals = allSteps.filter((s) => s.kind === 'REFERRAL');

  const nextDueAction =
    [...overdueSteps, ...openSteps.filter((s) => s.dueDate >= today)].sort((a, b) =>
      a.dueDate < b.dueDate ? -1 : 1,
    )[0] ?? null;

  return { patient, openSteps, overdueSteps, completedSteps, referrals, nextDueAction };
}
