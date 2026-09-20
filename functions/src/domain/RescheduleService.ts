import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getStepById } from './CareStepService.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { DomainError, type CareStep } from './types.js';

/**
 * Takes an already-resolved ISO date — preset labels ("Tomorrow", "In 3 days",
 * spec §2C) are a WhatsApp presentation concern resolved by the workflow layer,
 * not the domain (a future "Choose another date" Flow can call this unchanged).
 */
export async function rescheduleStep(params: {
  actorUserId: string;
  stepId: string;
  toDate: string;
}): Promise<CareStep> {
  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const step = await getStepById(params.stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');

  if (step.status !== 'OPEN') {
    throw new DomainError('This step has already been closed.', 'INVALID_STATE');
  }
  if (actor.id !== step.ownerUserId) {
    throw new DomainError('Not authorized to reschedule this step.', 'UNAUTHORIZED');
  }

  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(step.id);

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const updated: CareStep = {
      ...step,
      dueDate: params.toDate,
      rescheduleHistory: [
        ...step.rescheduleHistory,
        { fromDate: step.dueDate, toDate: params.toDate, byUserId: actor.id, at: now },
      ],
      updatedAt: now,
    };
    tx.set(stepRef, updated);

    recordAuditEvent(tx, {
      eventType: 'STEP_RESCHEDULED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
    });

    createCCEEvent(tx, {
      eventType: 'STEP_RESCHEDULED',
      stepId: step.id,
      patientId: step.patientId,
      fromDate: step.dueDate,
      toDate: params.toDate,
    });

    return updated;
  });
}
