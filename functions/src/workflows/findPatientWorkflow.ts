import { searchPatients, getPatientById } from '../domain/PatientService.js';
import { getOpenSteps } from '../domain/CareStepService.js';
import { DomainError } from '../domain/types.js';
import { updateConversation } from '../conversation/ConversationService.js';
import {
  renderNoMatches,
  renderPatientList,
  renderPatientSummary,
  renderStepActions,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleFindCommand(
  to: string,
  whatsappSenderId: string,
  query: string,
): Promise<OutboundMessage[]> {
  const matches = await searchPatients(query);
  if (matches.length === 0) return [renderNoMatches(to, query)];
  if (matches.length === 1) {
    return handleSelectPatient(to, whatsappSenderId, matches[0]!.id);
  }
  return [await renderPatientList(to, whatsappSenderId, matches)];
}

export async function handleSelectPatient(
  to: string,
  whatsappSenderId: string,
  patientId: string,
): Promise<OutboundMessage[]> {
  const patient = await getPatientById(patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const openSteps = await getOpenSteps(patientId);

  // With exactly one open step, skip the intermediate list — same "pick the
  // obvious next thing" convenience as auto-selecting a single patient match.
  if (openSteps.length === 1) {
    return handleSelectStep(to, whatsappSenderId, patientId, openSteps[0]!.id);
  }

  await updateConversation(whatsappSenderId, {
    workflow: 'PATIENT_STEPS',
    patientId,
    stepId: null,
    currentState: 'PATIENT_SELECTED',
  });

  return [await renderPatientSummary(to, whatsappSenderId, patient, openSteps)];
}

export async function handleSelectStep(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  await updateConversation(whatsappSenderId, {
    workflow: 'PATIENT_STEPS',
    patientId,
    stepId,
    currentState: 'STEP_SELECTED',
  });
  return [await renderStepActions(to, whatsappSenderId, patientId, stepId)];
}
