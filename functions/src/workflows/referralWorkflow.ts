import { stageStep, confirmStep } from '../domain/ReferralService.js';
import { getFacilityById } from '../domain/FacilityService.js';
import { renderReferralConfirm, renderReferralConfirmed } from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

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
