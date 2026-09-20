import { randomUUID } from 'node:crypto';
import { getDb } from '../domain/firestore.js';
import { ConversationError, type ConversationState, type PendingAction } from './types.js';

/** Spec §2D: 15–30 min recommended; we use the midpoint. */
export const CONVERSATION_TTL_MINUTES = 20;

const CONVERSATIONS = 'conversations';

function conversationDocId(whatsappSenderId: string): string {
  return whatsappSenderId;
}

function newExpiry(): string {
  return new Date(Date.now() + CONVERSATION_TTL_MINUTES * 60 * 1000).toISOString();
}

function isExpired(state: ConversationState): boolean {
  return new Date(state.expiresAt).getTime() <= Date.now();
}

function freshState(whatsappSenderId: string, userId: string): ConversationState {
  return {
    whatsappSenderId,
    userId,
    workflow: 'MENU',
    patientId: null,
    stepId: null,
    currentState: 'MENU',
    lastAction: null,
    pendingActions: {},
    expiresAt: newExpiry(),
    lastInboundMessageId: null,
  };
}

/**
 * Loads the sender's conversation, resetting it to a fresh MENU state if it
 * doesn't exist or has expired. Never returns expired state to a caller.
 */
export async function loadOrResetConversation(
  whatsappSenderId: string,
  userId: string,
): Promise<{ state: ConversationState; wasExpired: boolean }> {
  const ref = getDb().collection(CONVERSATIONS).doc(conversationDocId(whatsappSenderId));
  const doc = await ref.get();

  if (!doc.exists) {
    const state = freshState(whatsappSenderId, userId);
    await ref.set(state);
    return { state, wasExpired: false };
  }

  const existing = doc.data() as ConversationState;
  if (isExpired(existing) || existing.userId !== userId) {
    // Spec §18 "Worker changed": a different resolved user takes over cleanly.
    const state = freshState(whatsappSenderId, userId);
    await ref.set(state);
    return { state, wasExpired: isExpired(existing) };
  }

  return { state: existing, wasExpired: false };
}

/** Merges a patch into conversation state and slides the expiry forward. */
export async function updateConversation(
  whatsappSenderId: string,
  patch: Partial<Omit<ConversationState, 'whatsappSenderId'>>,
): Promise<ConversationState> {
  const ref = getDb().collection(CONVERSATIONS).doc(conversationDocId(whatsappSenderId));
  const doc = await ref.get();
  if (!doc.exists) {
    throw new ConversationError('No active conversation.', 'CONVERSATION_EXPIRED');
  }
  const current = doc.data() as ConversationState;
  const next: ConversationState = { ...current, ...patch, expiresAt: newExpiry() };
  await ref.set(next);
  return next;
}

/**
 * Issues opaque action tokens carrying only ids, never clinical data (spec
 * §9), for every action in one read-modify-write. A rendered WhatsApp message
 * commonly needs several tokens at once (one per button/list row); issuing
 * them one at a time via concurrent calls would race on the same conversation
 * document and silently drop all but the last write.
 */
export async function issueActionTokens(
  whatsappSenderId: string,
  actions: Omit<PendingAction, 'expiresAt'>[],
): Promise<string[]> {
  const ref = getDb().collection(CONVERSATIONS).doc(conversationDocId(whatsappSenderId));
  const doc = await ref.get();
  if (!doc.exists) {
    throw new ConversationError('No active conversation.', 'CONVERSATION_EXPIRED');
  }
  const current = doc.data() as ConversationState;
  const expiresAt = newExpiry();

  const tokens: string[] = [];
  const pendingActions = { ...current.pendingActions };
  for (const action of actions) {
    const token = randomUUID();
    pendingActions[token] = { ...action, expiresAt };
    tokens.push(token);
  }

  const next: ConversationState = { ...current, pendingActions, expiresAt };
  await ref.set(next);
  return tokens;
}

export async function issueActionToken(
  whatsappSenderId: string,
  action: Omit<PendingAction, 'expiresAt'>,
): Promise<string> {
  const [token] = await issueActionTokens(whatsappSenderId, [action]);
  return token!;
}

/**
 * Resolves and consumes an action token. Throws CONVERSATION_EXPIRED if the
 * session itself has lapsed (spec §2D copy) or STALE_ACTION if the token is
 * unknown/already used (spec §18 copy) — callers render different copy for each.
 */
export async function resolveActionToken(
  whatsappSenderId: string,
  token: string,
): Promise<{ state: ConversationState; action: PendingAction }> {
  const ref = getDb().collection(CONVERSATIONS).doc(conversationDocId(whatsappSenderId));
  const doc = await ref.get();
  if (!doc.exists) {
    throw new ConversationError('No active conversation.', 'CONVERSATION_EXPIRED');
  }

  const state = doc.data() as ConversationState;
  if (isExpired(state)) {
    throw new ConversationError('This session has expired.', 'CONVERSATION_EXPIRED');
  }

  const action = state.pendingActions[token];
  if (!action) {
    throw new ConversationError('This action is no longer available.', 'STALE_ACTION');
  }
  if (new Date(action.expiresAt).getTime() <= Date.now()) {
    throw new ConversationError('This action is no longer available.', 'STALE_ACTION');
  }

  // Consume the token — it must not be replayable (spec §18 duplicate/stale actions).
  const { [token]: _consumed, ...remaining } = state.pendingActions;
  const next: ConversationState = { ...state, pendingActions: remaining, expiresAt: newExpiry() };
  await ref.set(next);

  return { state: next, action };
}

export async function recordInboundMessageId(
  whatsappSenderId: string,
  messageId: string,
): Promise<void> {
  await updateConversation(whatsappSenderId, { lastInboundMessageId: messageId });
}
