import { searchPatients, getPatientById } from '../domain/PatientService.js';
import { getOpenSteps, getStepById } from '../domain/CareStepService.js';
import { getUserById } from '../domain/UserService.js';
import { DomainError } from '../domain/types.js';
import { updateConversation } from '../conversation/ConversationService.js';
import {
  renderNoMatches,
  renderPatientList,
  renderPatientListFlow,
  renderPatientSummary,
  renderStepActions,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleFindCommand(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  query: string,
): Promise<OutboundMessage[]> {
  const matches = await searchPatients(query);
  if (matches.length === 0) return [renderNoMatches(to, query)];
  if (matches.length === 1) {
    return handleSelectPatient(to, whatsappSenderId, actorUserId, matches[0]!.id);
  }
  const flowId = process.env.FLOW_SELECT_ITEM_ID;
  if (flowId) return [renderPatientListFlow(to, flowId, matches)];
  return [await renderPatientList(to, whatsappSenderId, matches)];
}

export async function handleSelectPatient(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  patientId: string,
): Promise<OutboundMessage[]> {
  const patient = await getPatientById(patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const openSteps = await getOpenSteps(patientId);

  // With exactly one open step, skip the intermediate list — same "pick the
  // obvious next thing" convenience as auto-selecting a single patient match.
  if (openSteps.length === 1) {
    return handleSelectStep(to, whatsappSenderId, actorUserId, patientId, openSteps[0]!.id);
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
  actorUserId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  await updateConversation(whatsappSenderId, {
    workflow: 'PATIENT_STEPS',
    patientId,
    stepId,
    currentState: 'STEP_SELECTED',
  });

  const actor = await getUserById(actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');
  const step = await getStepById(stepId);
  if (!step) throw new DomainError('Step not found.', 'NOT_FOUND');

  return [await renderStepActions(to, whatsappSenderId, actor, step)];
}
