import { stageStep, confirmStep } from '../domain/ReferralService.js';
import { getFacilityById } from '../domain/FacilityService.js';
import { searchPatients } from '../domain/PatientService.js';
import { updateConversation } from '../conversation/ConversationService.js';
import {
  renderFindPatientPrompt,
  renderNoMatches,
  renderPatientList,
  renderReferralConfirm,
  renderReferralConfirmed,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

/**
 * "Add next step" (top-level menu item) — unlike the normal find-patient
 * flow, this always lands on staging a referral regardless of whether the
 * patient already has open steps; a worker may deliberately want to queue
 * up a follow-up ahead of closing the current one.
 */
export async function handleAddNextStepCommand(to: string, whatsappSenderId: string): Promise<OutboundMessage[]> {
  await updateConversation(whatsappSenderId, {
    workflow: 'REFERRAL',
    patientId: null,
    stepId: null,
    currentState: 'AWAITING_PATIENT_FOR_STAGE',
  });
  return [renderFindPatientPrompt(to)];
}

export async function handleFindForStageCommand(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  query: string,
): Promise<OutboundMessage[]> {
  const matches = await searchPatients(query);
  if (matches.length === 0) return [renderNoMatches(to, query)];
  if (matches.length === 1) {
    return handleStageReferral(to, whatsappSenderId, actorUserId, matches[0]!.id);
  }
  return [await renderPatientList(to, whatsappSenderId, matches, 'SELECT_PATIENT_FOR_STAGE')];
}

export async function handleStageReferral(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  patientId: string,
): Promise<OutboundMessage[]> {
  const staged = await stageStep({ actorUserId, patientId });
  return [
    await renderReferralConfirm(
      to,
      whatsappSenderId,
      staged.patientId,
      staged.destinationFacilityId,
      staged.destinationFacilityName,
      staged.dueDate,
    ),
  ];
}

export async function handleConfirmReferral(
  to: string,
  actorUserId: string,
  patientId: string,
  data: { destinationFacilityId: string; dueDate: string },
): Promise<OutboundMessage[]> {
  await confirmStep({
    actorUserId,
    patientId,
    destinationFacilityId: data.destinationFacilityId,
    dueDate: data.dueDate,
  });
  const facility = await getFacilityById(data.destinationFacilityId);
  return [await renderReferralConfirmed(to, facility?.name ?? 'the receiving facility')];
}

export function handleChangeReferral(to: string): OutboundMessage[] {
  return [
    {
      kind: 'text',
      to,
      body: "Changing referral details isn't available yet. Type menu to start over.",
    },
  ];
}
