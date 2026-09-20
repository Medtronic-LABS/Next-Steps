import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getStepById } from './CareStepService.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { DomainError, type CareStep } from './types.js';

/**
 * Open steps referred to this facility that haven't yet arrived (spec Phase
 * 4). Arrival is independent of closure (spec §2A): a step can arrive without
 * being done, or close without ever recording an arrival (e.g. closed by the
 * referring ANM's follow-up call).
 */
export async function getExpectedArrivals(facilityId: string): Promise<CareStep[]> {
  const snap = await getDb()
    .collection(Collections.careSteps)
    .where('destinationFacilityId', '==', facilityId)
    .where('status', '==', 'OPEN')
    .where('arrivedAt', '==', null)
    .get();
  return snap.docs.map((doc) => doc.data() as CareStep);
}

export async function recordArrival(params: { actorUserId: string; stepId: string }): Promise<CareStep> {
  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const step = await getStepById(params.stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');

  if (step.status !== 'OPEN') {
    throw new DomainError('This step has already been closed.', 'INVALID_STATE');
  }
  if (actor.facilityId !== step.destinationFacilityId) {
    throw new DomainError('Not authorized to record arrival for this step.', 'UNAUTHORIZED');
  }
  if (step.arrivedAt !== null) {
    // Spec §18: do not apply the same operation twice.
    throw new DomainError('Arrival has already been recorded for this step.', 'INVALID_STATE');
  }

  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(step.id);

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const updated: CareStep = {
      ...step,
      arrivedAt: now,
      arrivedByUserId: actor.id,
      arrivalFacilityId: actor.facilityId,
      updatedAt: now,
    };
    tx.set(stepRef, updated);

    recordAuditEvent(tx, {
      eventType: 'ARRIVAL_RECORDED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
    });

    createCCEEvent(tx, {
      eventType: 'ARRIVAL_RECORDED',
      stepId: step.id,
      patientId: step.patientId,
    });

    return updated;
  });
}
