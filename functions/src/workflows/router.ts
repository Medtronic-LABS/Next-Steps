import type { InboundMessage } from '../webhook/inbound.js';
import { normalizeWhatsAppNumber, resolveSender } from '../adapter/senderResolution.js';
import {
  CMD,
  renderFindPatientPrompt,
  renderSessionExpired,
  renderStaleAction,
  renderUnregistered,
  renderUnrecognized,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';
import { loadOrResetConversation, resolveActionToken } from '../conversation/ConversationService.js';
import { ConversationError } from '../conversation/types.js';
import { DomainError, type ContactOutcomeValue, type Provenance } from '../domain/types.js';
import { handleMenuCommand } from './menuWorkflow.js';
import { handleFindCommand, handleSelectPatient, handleSelectStep } from './findPatientWorkflow.js';
import { handleChangeReferral, handleConfirmReferral, handleStageReferral } from './referralWorkflow.js';
import { handleWorklistCommand } from './worklistWorkflow.js';
import { handleConfirmArrival, handleExpectedArrivalsCommand } from './arrivalWorkflow.js';
import {
  handleCall,
  handleCloseWithProvenance,
  handleContactOutcome,
  handleReschedule,
  handleRescheduleChooseAnother,
  handleStartClose,
  handleStartReschedule,
} from './closureWorkflow.js';

const GREETINGS = new Set(['menu', 'hi', 'hello']);

export async function routeInboundMessage(message: InboundMessage): Promise<OutboundMessage[]> {
  const to = normalizeWhatsAppNumber(message.from);
  const user = await resolveSender(message.from);
  if (!user) return [renderUnregistered(to)];

  const { wasExpired } = await loadOrResetConversation(to, user.id);

  if (message.kind === 'text') {
    const text = (message.text ?? '').trim();
    const lower = text.toLowerCase();
    if (GREETINGS.has(lower)) return handleMenuCommand(to, user);
    if (lower.startsWith('find ')) return handleFindCommand(to, to, user.id, text.slice('find '.length).trim());
    return [renderUnrecognized(to)];
  }

  const replyId = message.replyId ?? '';
  if (replyId === CMD.MENU) return handleMenuCommand(to, user);
  if (replyId === CMD.FIND_PATIENT) return [renderFindPatientPrompt(to)];
  if (replyId === CMD.WORKLIST) return handleWorklistCommand(to, to, user.id);
  if (replyId === CMD.EXPECTED_ARRIVALS) return handleExpectedArrivalsCommand(to, to, user.id);

  // Fixed commands never expire; anything else is an opaque token that must be
  // resolved against conversation state, which a reset (spec §2D) invalidates.
  if (wasExpired) return [renderSessionExpired(to)];

  try {
    const { action } = await resolveActionToken(to, replyId);
    switch (action.type) {
      case 'SELECT_PATIENT':
        return handleSelectPatient(to, to, user.id, action.patientId!);
      case 'SELECT_STEP':
        return handleSelectStep(to, to, user.id, action.patientId!, action.stepId!);
      case 'CONFIRM_ARRIVAL':
        return handleConfirmArrival(to, user.id, action.stepId!);
      case 'STAGE_REFERRAL':
        return handleStageReferral(to, to, user.id, action.patientId!);
      case 'CONFIRM_REFERRAL':
        return handleConfirmReferral(to, user.id, action.patientId!, {
          destinationFacilityId: action.data!.destinationFacilityId!,
          dueDate: action.data!.dueDate!,
        });
      case 'CHANGE_REFERRAL':
        return handleChangeReferral(to);
      case 'CALL':
        return handleCall(to, to, action.patientId!, action.stepId!);
      case 'CONTACT_OUTCOME':
        return handleContactOutcome(to, user.id, action.stepId!, action.data!.outcome as ContactOutcomeValue);
      case 'START_CLOSE':
        return handleStartClose(to, to, action.patientId!, action.stepId!);
      case 'CLOSE_WITH_PROVENANCE':
        return handleCloseWithProvenance(to, user.id, action.stepId!, action.data!.provenance as Provenance);
      case 'START_RESCHEDULE':
        return handleStartReschedule(to, to, action.patientId!, action.stepId!);
      case 'RESCHEDULE':
        return handleReschedule(to, user.id, action.stepId!, action.data!.toDate!);
      case 'RESCHEDULE_CHOOSE_ANOTHER':
        return handleRescheduleChooseAnother(to);
      default:
        return [renderUnrecognized(to)];
    }
  } catch (err) {
    if (err instanceof ConversationError) {
      return [err.code === 'CONVERSATION_EXPIRED' ? renderSessionExpired(to) : renderStaleAction(to)];
    }
    if (err instanceof DomainError) {
      return [{ kind: 'text', to, body: err.message }];
    }
    throw err;
  }
}
