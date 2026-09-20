import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { getDb } from '../../src/domain/firestore.js';
import {
  issueActionToken,
  loadOrResetConversation,
  resolveActionToken,
} from '../../src/conversation/ConversationService.js';
import { ConversationError } from '../../src/conversation/types.js';

const SENDER = '+919800000101';
const USER_ID = 'ANITA';

describe('ConversationService', () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it('creates a fresh MENU-state conversation on first contact', async () => {
    const { state, wasExpired } = await loadOrResetConversation(SENDER, USER_ID);
    expect(wasExpired).toBe(false);
    expect(state.workflow).toBe('MENU');
    expect(state.pendingActions).toEqual({});
  });

  it('resolves a freshly issued token exactly once', async () => {
    await loadOrResetConversation(SENDER, USER_ID);
    const token = await issueActionToken(SENDER, { type: 'SELECT_PATIENT', patientId: 'LAKSHMI_DEVI' });

    const { action } = await resolveActionToken(SENDER, token);
    expect(action.type).toBe('SELECT_PATIENT');
    expect(action.patientId).toBe('LAKSHMI_DEVI');

    // Spec §18 "stale action": a token must not be replayable.
    await expect(resolveActionToken(SENDER, token)).rejects.toMatchObject({
      code: 'STALE_ACTION',
    } satisfies Partial<ConversationError>);
  });

  it('treats an unknown token as a stale action', async () => {
    await loadOrResetConversation(SENDER, USER_ID);
    await expect(resolveActionToken(SENDER, 'not-a-real-token')).rejects.toMatchObject({
      code: 'STALE_ACTION',
    } satisfies Partial<ConversationError>);
  });

  it('treats a lapsed session as expired, not stale (spec §2D copy)', async () => {
    await loadOrResetConversation(SENDER, USER_ID);
    const token = await issueActionToken(SENDER, { type: 'SELECT_PATIENT', patientId: 'LAKSHMI_DEVI' });

    // Simulate the 20-minute TTL having passed.
    await getDb().collection('conversations').doc(SENDER).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(resolveActionToken(SENDER, token)).rejects.toMatchObject({
      code: 'CONVERSATION_EXPIRED',
    } satisfies Partial<ConversationError>);
  });

  it('resets an expired conversation to a fresh MENU state on next contact', async () => {
    await loadOrResetConversation(SENDER, USER_ID);
    await getDb().collection('conversations').doc(SENDER).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      patientId: 'LAKSHMI_DEVI',
    });

    const { state, wasExpired } = await loadOrResetConversation(SENDER, USER_ID);
    expect(wasExpired).toBe(true);
    expect(state.patientId).toBeNull();
  });
});
