import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getStepById } from './CareStepService.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { DomainError, type CareStep, type ContactOutcomeValue } from './types.js';

/**
 * Persists the outcome of a Call action (spec §2B). The WhatsApp adapter never
 * assumes the patient was reached — this is always an explicit follow-up
 * question after the worker returns from the call.
 */
export async function recordContactOutcome(params: {
  actorUserId: string;
  stepId: string;
  outcome: ContactOutcomeValue;
}): Promise<CareStep> {
  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const step = await getStepById(params.stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');

  if (step.status !== 'OPEN') {
    throw new DomainError('This step has already been closed.', 'INVALID_STATE');
  }
  if (actor.id !== step.ownerUserId) {
    throw new DomainError('Not authorized to record a contact outcome for this step.', 'UNAUTHORIZED');
  }

  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(step.id);

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const updated: CareStep = {
      ...step,
      contactOutcomes: [
        ...step.contactOutcomes,
        { outcome: params.outcome, byUserId: actor.id, at: now },
      ],
      updatedAt: now,
    };
    tx.set(stepRef, updated);

    recordAuditEvent(tx, {
      eventType: 'CONTACT_OUTCOME_RECORDED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
    });

    createCCEEvent(tx, {
      eventType: 'CONTACT_OUTCOME_RECORDED',
      stepId: step.id,
      patientId: step.patientId,
      outcome: params.outcome,
    });

    return updated;
  });
}
