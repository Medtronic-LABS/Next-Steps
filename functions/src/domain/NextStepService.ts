import { randomUUID } from 'node:crypto';
import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getPatientById } from './PatientService.js';
import { getStepById } from './CareStepService.js';
import { closeStep } from './ClosureService.js';
import { getCategoryById } from '../fixtures/stepCategories.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { DomainError, type CareStep, type Provenance } from './types.js';

export interface CreateNextStepInput {
  actorUserId: string;
  patientId: string;
  programmeId: string;
  categoryId: string; // e.g. 'REFERRAL', 'ANC', 'FOLLOW_UP', 'REVIEW'
  dueDate?: string; // defaults from category.defaultDueInDays
  destinationFacilityId?: string; // required when the category requires one
}

/**
 * Condition-neutral next-step creation (addendum §5/§17) — the same
 * mechanism for a REFERRAL, an ANC contact, or a hypertension REVIEW.
 * Complements (does not replace) ReferralService.stageStep/confirmStep,
 * which remain the REFERRAL-specific two-tap staging flow the existing
 * golden conversations already assume.
 */
export async function createNextStep(input: CreateNextStepInput): Promise<CareStep> {
  const actor = await getUserById(input.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const patient = await getPatientById(input.patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const category = getCategoryById(input.programmeId, input.categoryId);
  if (!category) throw new DomainError('Unknown step category.', 'INVALID_STATE');

  if (category.requiresDestinationFacility && !input.destinationFacilityId) {
    throw new DomainError('This step category requires a destination facility.', 'INVALID_STATE');
  }

  const dueDate =
    input.dueDate ??
    new Date(Date.now() + category.defaultDueInDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(randomUUID());

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const step: CareStep = {
      id: stepRef.id,
      patientId: patient.id,
      kind: category.id,
      status: 'OPEN',
      originFacilityId: actor.facilityId,
      destinationFacilityId: input.destinationFacilityId ?? actor.facilityId,
      ownerUserId: actor.id,
      facilityId: actor.facilityId,
      dueDate,
      arrivedAt: null,
      arrivedByUserId: null,
      arrivalFacilityId: null,
      closedAt: null,
      closedByUserId: null,
      provenance: null,
      downgraded: null,
      contactOutcomes: [],
      rescheduleHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    tx.set(stepRef, step);

    recordAuditEvent(tx, {
      eventType: 'NEXT_STEP_CREATED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
    });

    createCCEEvent(tx, {
      eventType: 'NEXT_STEP_CREATED',
      stepId: step.id,
      patientId: step.patientId,
      category: category.id,
      dueDate,
    });

    return step;
  });
}

/**
 * Generalized completion: pass `provenance` for facility-routed categories
 * (delegates to ClosureService.closeStep's provenance/downgrade machinery,
 * unchanged) or omit it for a plain category (ANC, FOLLOW_UP, REVIEW, ...) —
 * there's no "where was it done" question for a step that was never routed
 * anywhere.
 */
export async function completeNextStep(params: {
  actorUserId: string;
  stepId: string;
  provenance?: Provenance;
}): Promise<CareStep> {
  if (params.provenance) {
    return closeStep({ actorUserId: params.actorUserId, stepId: params.stepId, provenance: params.provenance });
  }

  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');
  const step = await getStepById(params.stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');
  if (step.status !== 'OPEN') throw new DomainError('This step has already been closed.', 'INVALID_STATE');
  if (actor.id !== step.ownerUserId) throw new DomainError('Not authorized to complete this step.', 'UNAUTHORIZED');

  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(step.id);
  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const updated: CareStep = { ...step, status: 'DONE', closedAt: now, closedByUserId: actor.id, updatedAt: now };
    tx.set(stepRef, updated);

    recordAuditEvent(tx, {
      eventType: 'STEP_CLOSED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
    });

    createCCEEvent(tx, { eventType: 'STEP_CLOSED', stepId: step.id, patientId: step.patientId });

    return updated;
  });
}
