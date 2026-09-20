import { closeStep } from '../domain/ClosureService.js';
import { rescheduleStep } from '../domain/RescheduleService.js';
import { recordContactOutcome } from '../domain/ContactOutcomeService.js';
import { getPatientById } from '../domain/PatientService.js';
import { DomainError, type ContactOutcomeValue, type Provenance } from '../domain/types.js';
import {
  renderCallInitiated,
  renderContactOutcomeRecorded,
  renderProvenancePrompt,
  renderRescheduleChooseAnotherUnavailable,
  renderReschedulePresets,
  renderStepClosed,
  renderStepRescheduled,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleCall(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  const patient = await getPatientById(patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');
  return renderCallInitiated(to, whatsappSenderId, patientId, stepId, patient.displayName, patient.phoneNumber);
}

export async function handleContactOutcome(
  to: string,
  actorUserId: string,
  stepId: string,
  outcome: ContactOutcomeValue,
): Promise<OutboundMessage[]> {
  await recordContactOutcome({ actorUserId, stepId, outcome });
  return [renderContactOutcomeRecorded(to)];
}

export async function handleStartClose(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  return [await renderProvenancePrompt(to, whatsappSenderId, patientId, stepId)];
}

export async function handleCloseWithProvenance(
  to: string,
  actorUserId: string,
  stepId: string,
  provenance: Provenance,
): Promise<OutboundMessage[]> {
  const step = await closeStep({ actorUserId, stepId, provenance });
  return [renderStepClosed(to, step.downgraded ?? false)];
}

export async function handleStartReschedule(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  return [await renderReschedulePresets(to, whatsappSenderId, patientId, stepId)];
}

export async function handleReschedule(
  to: string,
  actorUserId: string,
  stepId: string,
  toDate: string,
): Promise<OutboundMessage[]> {
  await rescheduleStep({ actorUserId, stepId, toDate });
  return [renderStepRescheduled(to, toDate)];
}

export function handleRescheduleChooseAnother(to: string): OutboundMessage[] {
  return [renderRescheduleChooseAnotherUnavailable(to)];
}
