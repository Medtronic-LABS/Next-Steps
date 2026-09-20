// Short-lived orchestration state (spec §8). Never authoritative — Firebase
// domain data always is. Nothing clinical is stored in a pendingAction beyond
// the ids needed to re-fetch and re-validate against Firestore (spec §9).

export type WorkflowName =
  | 'MENU'
  | 'FIND_PATIENT'
  | 'PATIENT_STEPS'
  | 'REFERRAL'
  | 'WORKLIST'
  | 'CLOSURE';

export interface PendingAction {
  type: string;
  patientId?: string;
  stepId?: string;
  data?: Record<string, string>;
  expiresAt: string; // ISO — always <= the conversation's own expiresAt
}

export interface ConversationState {
  whatsappSenderId: string;
  userId: string;
  workflow: WorkflowName;
  patientId: string | null;
  stepId: string | null;
  currentState: string;
  lastAction: string | null;
  pendingActions: Record<string, PendingAction>;
  expiresAt: string; // ISO
  lastInboundMessageId: string | null;
}

export class ConversationError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONVERSATION_EXPIRED' | 'STALE_ACTION',
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}
