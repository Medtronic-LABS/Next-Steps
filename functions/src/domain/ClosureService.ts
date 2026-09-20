import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getStepById } from './CareStepService.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { DomainError, type CareStep, type Provenance } from './types.js';

/**
 * A step can be closed by the ANM who owns it (follow-up after a call) or by
 * staff at the destination facility (spec Phase 4's one-tap on-site closure,
 * which will call this same function — authorization is future-proofed here
 * even though that workflow isn't built until Phase 4).
 */
function assertCanClose(actor: { id: string; facilityId: string }, step: CareStep): void {
  const isOwner = actor.id === step.ownerUserId;
  const isDestinationFacility = actor.facilityId === step.destinationFacilityId;
  if (!isOwner && !isDestinationFacility) {
    throw new DomainError('Not authorized to close this step.', 'UNAUTHORIZED');
  }
}

/**
 * Downgrade = the referral did not resolve the way it was intended to (spec §3
 * workflow-matrix assumption): anything other than being seen at the referred
 * facility counts as a downgrade.
 */
export function determineDowngrade(provenance: Provenance): boolean {
  return provenance !== 'AT_REFERRED_FACILITY';
}

export async function closeStep(params: {
  actorUserId: string;
  stepId: string;
  provenance: Provenance;
}): Promise<CareStep> {
  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const step = await getStepById(params.stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');

  if (step.status !== 'OPEN') {
    // Spec §18: "Step already closed — do not apply the operation twice."
    throw new DomainError('This step has already been closed.', 'INVALID_STATE');
  }

  assertCanClose(actor, step);

  const downgraded = determineDowngrade(params.provenance);
  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(step.id);

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const updated: CareStep = {
      ...step,
      status: 'DONE',
      closedAt: now,
      closedByUserId: actor.id,
      provenance: params.provenance,
      downgraded,
      updatedAt: now,
    };
    tx.set(stepRef, updated);

    recordAuditEvent(tx, {
      eventType: 'STEP_CLOSED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
      provenance: params.provenance,
      downgraded,
    });

    createCCEEvent(tx, {
      eventType: 'STEP_CLOSED',
      stepId: step.id,
      patientId: step.patientId,
      provenance: params.provenance,
      downgraded,
    });

    return updated;
  });
}
