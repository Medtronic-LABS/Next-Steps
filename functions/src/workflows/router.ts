import type { InboundMessage } from '../webhook/inbound.js';
import { normalizeWhatsAppNumber, resolveSender } from '../adapter/senderResolution.js';
import {
  CMD,
  renderMoreMenu,
  renderSessionExpired,
  renderStaleAction,
  renderUnregistered,
  renderUnrecognized,
} from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';
import { loadOrResetConversation, resolveActionToken } from '../conversation/ConversationService.js';
import { ConversationError } from '../conversation/types.js';
import { DomainError, type ContactOutcomeValue, type Provenance, type User } from '../domain/types.js';
import { handleMenuCommand } from './menuWorkflow.js';
import {
  handleFindCommand,
  handleListPatientsCommand,
  handleSelectPatient,
  handleSelectStep,
} from './findPatientWorkflow.js';
import {
  handleAddNextStepCommand,
  handleChangeReferral,
  handleConfirmReferral,
  handleFindForStageCommand,
  handleStageReferral,
} from './referralWorkflow.js';
import { handleWorklistCommand } from './worklistWorkflow.js';
import { handleConfirmArrival, handleExpectedArrivalsCommand } from './arrivalWorkflow.js';
import { handleAlertsCommand } from './alertsHistoryWorkflow.js';
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

const PROVENANCE_VALUES: readonly Provenance[] = [
  'AT_REFERRED_FACILITY',
  'OTHER_FACILITY',
  'PRIVATE_PROVIDER',
  'NOT_COMPLETED',
];
function isProvenance(value: unknown): value is Provenance {
  return typeof value === 'string' && (PROVENANCE_VALUES as readonly string[]).includes(value);
}

/**
 * Fixed navigation commands (spec §9 — never expire, never carry patient/step
 * context). Shared by button taps and the menu Flow's RadioButtonsGroup
 * selection (MessageRenderer.renderMenuFlow), since both ultimately pick one
 * of the same fixed set of ids.
 */
async function dispatchFixedCommand(replyId: string, to: string, user: User): Promise<OutboundMessage[] | null> {
  if (replyId === CMD.MENU) return handleMenuCommand(to, user);
  if (replyId === CMD.FIND_PATIENT) return handleListPatientsCommand(to, to, user.id);
  if (replyId === CMD.WORKLIST) return handleWorklistCommand(to, to, user.id);
  if (replyId === CMD.EXPECTED_ARRIVALS) return handleExpectedArrivalsCommand(to, to, user.id);
  if (replyId === CMD.ADD_NEXT_STEP) return handleAddNextStepCommand(to, to);
  if (replyId === CMD.ALERTS) return handleAlertsCommand(to, user.id);
  if (replyId === CMD.MORE) return [renderMoreMenu(to, user.role)];
  return null;
}

export async function routeInboundMessage(message: InboundMessage): Promise<OutboundMessage[]> {
  const to = normalizeWhatsAppNumber(message.from);
  const user = await resolveSender(message.from);
  if (!user) return [renderUnregistered(to)];

  const { state, wasExpired } = await loadOrResetConversation(to, user.id);

  if (message.kind === 'text') {
    const text = (message.text ?? '').trim();
    const lower = text.toLowerCase();
    if (GREETINGS.has(lower)) return handleMenuCommand(to, user);
    if (lower.startsWith('find ')) {
      const query = text.slice('find '.length).trim();
      // "Add next step" set this state so the very next "find X" lands on
      // staging a referral instead of the normal find-patient view.
      if (state.currentState === 'AWAITING_PATIENT_FOR_STAGE') {
        return handleFindForStageCommand(to, to, user.id, query);
      }
      return handleFindCommand(to, to, user.id, query);
    }
    return [renderUnrecognized(to)];
  }

  if (message.kind === 'flow_reply') {
    // No opaque action token here — a Flow's own screen output carries its
    // state (see MessageRenderer.renderClosureProvenanceFlow /
    // renderPatientListFlow etc.). Response shape, not flowName,
    // discriminates which Flow this came from: Meta reports `name` as a
    // fixed "flow" constant, not something we choose per-Flow.
    const response = message.flowResponse ?? {};
    try {
      if (isProvenance(response.provenance) && typeof response.step_id === 'string') {
        return await handleCloseWithProvenance(to, user.id, response.step_id, response.provenance);
      }
      if (response.kind === 'patient' && typeof response.selected_id === 'string') {
        return await handleSelectPatient(to, to, user.id, response.selected_id);
      }
      if (response.kind === 'step' && typeof response.selected_id === 'string') {
        const [patientId, stepId] = response.selected_id.split('::');
        if (!patientId || !stepId) return [renderUnrecognized(to)];
        return await handleSelectStep(to, to, user.id, patientId, stepId);
      }
      if (response.kind === 'menu' && typeof response.selected_id === 'string') {
        const result = await dispatchFixedCommand(response.selected_id, to, user);
        return result ?? [renderUnrecognized(to)];
      }
      return [renderUnrecognized(to)];
    } catch (err) {
      if (err instanceof DomainError) return [{ kind: 'text', to, body: err.message }];
      throw err;
    }
  }

  const replyId = message.replyId ?? '';
  const fixedResult = await dispatchFixedCommand(replyId, to, user);
  if (fixedResult) return fixedResult;

  // Fixed commands never expire; anything else is an opaque token that must be
  // resolved against conversation state, which a reset (spec §2D) invalidates.
  if (wasExpired) return [renderSessionExpired(to)];

  try {
    const { action } = await resolveActionToken(to, replyId);
    switch (action.type) {
      case 'SELECT_PATIENT':
        return handleSelectPatient(to, to, user.id, action.patientId!);
      case 'SELECT_PATIENT_FOR_STAGE':
        return handleStageReferral(to, to, user.id, action.patientId!);
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
