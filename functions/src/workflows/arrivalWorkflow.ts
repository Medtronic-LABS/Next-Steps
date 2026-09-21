import { getExpectedArrivals, recordArrival } from '../domain/ArrivalService.js';
import { closeStep } from '../domain/ClosureService.js';
import { getUserById } from '../domain/UserService.js';
import { getPatientById } from '../domain/PatientService.js';
import { getStepById } from '../domain/CareStepService.js';
import { getFacilityById } from '../domain/FacilityService.js';
import { DomainError } from '../domain/types.js';
import {
  renderArrivalPrompt,
  renderArrivalRecorded,
  renderExpectedArrivals,
  renderExpectedArrivalsFlow,
  renderStepClosed,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleExpectedArrivalsCommand(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
): Promise<OutboundMessage[]> {
  const actor = await getUserById(actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const steps = await getExpectedArrivals(actor.facilityId);
  const patients = await Promise.all([...new Set(steps.map((s) => s.patientId))].map((id) => getPatientById(id)));
  const namesById = Object.fromEntries(
    patients.filter((p): p is NonNullable<typeof p> => p !== null).map((p) => [p.id, p.displayName]),
  );
  const flowId = process.env.FLOW_SELECT_ITEM_ID;
  if (flowId) return [renderExpectedArrivalsFlow(to, flowId, namesById, steps)];
  return [await renderExpectedArrivals(to, whatsappSenderId, namesById, steps)];
}

/** Selecting a patient from Expected Arrivals goes straight to Arrived/Not arrived (addendum §8). */
export async function handleSelectExpectedArrival(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  const patient = await getPatientById(patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');
  const step = await getStepById(stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');
  const originFacility = await getFacilityById(step.originFacilityId);

  return [
    await renderArrivalPrompt(
      to,
      whatsappSenderId,
      patientId,
      stepId,
      patient.displayName,
      originFacility?.name ?? step.originFacilityId,
      step.dueDate,
    ),
  ];
}

/**
 * "Selecting Arrived should update the same Next Step created by the ANM"
 * (addendum §8) — records arrival, then immediately closes the referral
 * with AT_REFERRED_FACILITY provenance in the same tap (she's staff at the
 * destination facility, so no provenance question either way — same rule
 * as the one-tap "Completed" path in closureWorkflow.handleStartClose).
 * Arrival and closure stay two distinct fields/events, spec §2A — this just
 * triggers both from one user action instead of two separate flows.
 */
export async function handleArrivalConfirmed(to: string, actorUserId: string, stepId: string): Promise<OutboundMessage[]> {
  try {
    await recordArrival({ actorUserId, stepId });
  } catch (err) {
    // Already arrived (e.g. re-tapped) is fine to continue past — still
    // attempt closure below. Anything else (unauthorized, unknown step) is
    // a real error and should surface.
    if (!(err instanceof DomainError && err.code === 'INVALID_STATE')) throw err;
  }

  const closed = await closeStep({ actorUserId, stepId, provenance: 'AT_REFERRED_FACILITY' });
  return [renderStepClosed(to, closed.downgraded ?? false)];
}

export function handleArrivalNotYet(to: string): OutboundMessage[] {
  return [{ kind: 'text', to, body: 'Noted. Type menu to continue.' }];
}

export async function handleConfirmArrival(
  to: string,
  actorUserId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  const step = await recordArrival({ actorUserId, stepId });
  const patient = await getPatientById(step.patientId);
  return [renderArrivalRecorded(to, patient?.displayName ?? step.patientId)];
}
