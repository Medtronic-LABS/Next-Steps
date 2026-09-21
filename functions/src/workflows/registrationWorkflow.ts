import { createPatient } from '../domain/PatientService.js';
import { updateConversation } from '../conversation/ConversationService.js';
import type { ConversationState } from '../conversation/types.js';
import {
  renderConsentPrompt,
  renderPatientCreated,
  renderPregnancyStatusPrompt,
  renderRegistrationNamePrompt,
  renderRegistrationPhonePrompt,
  renderRegistrationRchIdPrompt,
  renderRegistrationVillagePrompt,
  renderUnrecognized,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

/**
 * Lightweight registration (addendum §2/§3) as a sequential text-prompt
 * state machine — no Flow can be published on this Meta app (Business
 * Verification blocked, docs/whatsapp/flows.md), so this is the
 * buttons/list/text fallback spec §16 already treats as the reliable path.
 * Search-first dedup lives in the caller (findPatientWorkflow /
 * referralWorkflow render "None of these — create new patient" only after
 * showing matches); this workflow itself never re-checks for duplicates.
 */
export async function handleStartRegistration(to: string, whatsappSenderId: string): Promise<OutboundMessage[]> {
  await updateConversation(whatsappSenderId, {
    workflow: 'REGISTRATION',
    patientId: null,
    stepId: null,
    currentState: 'AWAITING_REG_NAME',
    draft: {},
  });
  return [renderRegistrationNamePrompt(to)];
}

export async function handleRegistrationText(
  to: string,
  whatsappSenderId: string,
  state: ConversationState,
  text: string,
): Promise<OutboundMessage[]> {
  const draft = state.draft ?? {};

  switch (state.currentState) {
    case 'AWAITING_REG_NAME': {
      await updateConversation(whatsappSenderId, {
        currentState: 'AWAITING_REG_PHONE',
        draft: { ...draft, name: text },
      });
      return [renderRegistrationPhonePrompt(to)];
    }
    case 'AWAITING_REG_PHONE': {
      await updateConversation(whatsappSenderId, {
        currentState: 'AWAITING_REG_VILLAGE',
        draft: { ...draft, phoneNumber: text },
      });
      return [renderRegistrationVillagePrompt(to)];
    }
    case 'AWAITING_REG_VILLAGE': {
      await updateConversation(whatsappSenderId, {
        currentState: 'AWAITING_REG_RCH_ID',
        draft: { ...draft, village: text },
      });
      return [renderRegistrationRchIdPrompt(to)];
    }
    case 'AWAITING_REG_RCH_ID': {
      const rchId = text.trim().toLowerCase() === 'skip' ? '' : text.trim();
      await updateConversation(whatsappSenderId, {
        currentState: 'AWAITING_REG_PREGNANCY',
        draft: { ...draft, rchId },
      });
      return [await renderPregnancyStatusPrompt(to, whatsappSenderId)];
    }
    default:
      return [renderUnrecognized(to)];
  }
}

export async function handleRegistrationPregnancyStatus(
  to: string,
  whatsappSenderId: string,
  draft: Record<string, string>,
  pregnancyStatus: string,
): Promise<OutboundMessage[]> {
  await updateConversation(whatsappSenderId, {
    currentState: 'AWAITING_REG_CONSENT',
    draft: { ...draft, pregnancyStatus },
  });
  return [await renderConsentPrompt(to, whatsappSenderId)];
}

export async function handleRegistrationConsent(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  draft: Record<string, string>,
  consent: boolean,
): Promise<OutboundMessage[]> {
  const hasPregnancyContext = draft.pregnancyStatus && draft.pregnancyStatus !== 'NONE';

  const patient = await createPatient({
    actorUserId,
    displayName: draft.name ?? 'Unknown',
    phoneNumber: draft.phoneNumber ?? '',
    village: draft.village ?? '',
    rchId: draft.rchId || null,
    programmeId: hasPregnancyContext ? 'RCH' : null,
    programmeAttributes: hasPregnancyContext ? { pregnancyStatus: draft.pregnancyStatus! } : {},
    whatsappReminderConsent: consent,
  });

  await updateConversation(whatsappSenderId, {
    workflow: 'MENU',
    patientId: patient.id,
    stepId: null,
    currentState: 'MENU',
    draft: {},
  });

  return [renderPatientCreated(to, patient)];
}
