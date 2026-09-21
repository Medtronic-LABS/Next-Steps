import { getPatientById } from '../domain/PatientService.js';
import { createNextStep } from '../domain/NextStepService.js';
import { getCategoriesForProgrammes } from '../fixtures/stepCategories.js';
import { DomainError } from '../domain/types.js';
import { renderNextStepCategoryPicker, renderNextStepCreated } from '../adapter/MessageRenderer.js';
import { handleStageReferral } from './referralWorkflow.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

/**
 * Condition-neutral "which kind of next step" picker (addendum §5/§17) —
 * categories come from the patient's own programme membership, not a
 * hard-coded RCH list. REFERRAL is always offered as a fallback for
 * patients with no programme context yet, since it's the one category
 * every programme in stepCategories.ts defines.
 */
export async function handleSelectPatientForNextStep(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  patientId: string,
): Promise<OutboundMessage[]> {
  const patient = await getPatientById(patientId);
  if (!patient) throw new DomainError('Patient not found.', 'NOT_FOUND');

  const programmeIds = patient.programmeContexts.map((c) => c.programmeId);
  const categories = getCategoriesForProgrammes(programmeIds.length > 0 ? programmeIds : ['RCH']);

  // Exactly one option (a patient in no programme, so only the REFERRAL
  // fallback applies) — skip the picker, same "obvious next thing"
  // convenience as auto-selecting a single search match.
  if (categories.length === 1) {
    return handleSelectNextStepCategory(to, whatsappSenderId, actorUserId, patientId, categories[0]!.programmeId, categories[0]!.id);
  }

  return [await renderNextStepCategoryPicker(to, whatsappSenderId, patientId, categories)];
}

export async function handleSelectNextStepCategory(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
  patientId: string,
  programmeId: string,
  categoryId: string,
): Promise<OutboundMessage[]> {
  // REFERRAL keeps its existing two-tap stage/confirm flow (destination
  // facility resolution, defaulted due date, explicit Confirm) — the golden
  // conversations already assume this exact interaction for referrals.
  if (categoryId === 'REFERRAL') {
    return handleStageReferral(to, whatsappSenderId, actorUserId, patientId);
  }

  const step = await createNextStep({ actorUserId, patientId, programmeId, categoryId });
  return [renderNextStepCreated(to, categoryId, step.dueDate)];
}
