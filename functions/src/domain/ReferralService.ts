import { randomUUID } from 'node:crypto';
import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getPatientById } from './PatientService.js';
import { listFacilities } from './FacilityService.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { DomainError, type CareStep } from './types.js';

/** Only an ANM can stage/confirm a referral in this MVP (spec's Anita workflow). */
function assertCanReferral(role: string): void {
  if (role !== 'ANM') {
    throw new DomainError('Only an ANM can stage or confirm a referral.', 'UNAUTHORIZED');
  }
}

export interface StagedReferral {
  patientId: string;
  destinationFacilityId: string;
  destinationFacilityName: string;
  dueDate: string;
}

/**
 * Tap 1 of 2 (spec §2E): compute the defaulted referral — no Firestore write.
 * Staging a referral has no effect on authoritative state, so it has no audit
 * event of its own; only ReferralService.confirmStep() does (see types.ts).
 */
export async function stageStep(params: {
  actorUserId: string;
  patientId: string;
}): Promise<StagedReferral> {
  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');
  assertCanReferral(actor.role);

  const patient = await getPatientById(params.patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const facilities = await listFacilities();
  const destination = facilities.find((f) => f.tier === 'CHC');
  if (!destination) {
    throw new DomainError('No receiving facility configured for referral.', 'INVALID_STATE');
  }

  return {
    patientId: patient.id,
    destinationFacilityId: destination.id,
    destinationFacilityName: destination.name,
    dueDate: new Date().toISOString().slice(0, 10),
  };
}

/** Tap 2 of 2: commit the (possibly edited) defaulted referral. */
export async function confirmStep(params: {
  actorUserId: string;
  patientId: string;
  destinationFacilityId: string;
  dueDate: string;
}): Promise<CareStep> {
  const actor = await getUserById(params.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');
  assertCanReferral(actor.role);

  const patient = await getPatientById(params.patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const db = getDb();
  const stepRef = db.collection(Collections.careSteps).doc(randomUUID());

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const step: CareStep = {
      id: stepRef.id,
      patientId: patient.id,
      kind: 'REFERRAL',
      status: 'OPEN',
      originFacilityId: actor.facilityId,
      destinationFacilityId: params.destinationFacilityId,
      ownerUserId: actor.id,
      facilityId: actor.facilityId,
      dueDate: params.dueDate,
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
      eventType: 'REFERRAL_CONFIRMED',
      stepId: step.id,
      patientId: step.patientId,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: actor.facilityId,
    });

    createCCEEvent(tx, {
      eventType: 'REFERRAL_CONFIRMED',
      stepId: step.id,
      patientId: step.patientId,
      originFacilityId: step.originFacilityId,
      destinationFacilityId: step.destinationFacilityId,
      dueDate: step.dueDate,
    });

    return step;
  });
}
