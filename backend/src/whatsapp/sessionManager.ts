import { ConversationSession } from './types.js';

const sessions = new Map<string, ConversationSession>();
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function getSession(phoneNumber: string, userId: string): ConversationSession {
  const existing = sessions.get(phoneNumber);
  const now = Date.now();

  if (existing && now - existing.lastActiveAt < SESSION_TTL_MS) {
    existing.lastActiveAt = now;
    return existing;
  }

  const newSession: ConversationSession = {
    userId,
    phoneNumber,
    currentState: 'IDLE',
    lastActiveAt: now,
  };

  sessions.set(phoneNumber, newSession);
  return newSession;
}

export function updateSession(session: ConversationSession): void {
  session.lastActiveAt = Date.now();
  sessions.set(session.phoneNumber, session);
}

export function clearSession(phoneNumber: string): void {
  sessions.delete(phoneNumber);
}

export function resetSession(session: ConversationSession): void {
  session.currentState = 'IDLE';
  session.patientId = undefined;
  session.stepId = undefined;
  session.stagedAction = undefined;
  session.stagedSteps = undefined;
  session.stagedRegistration = undefined;
  session.lastActiveAt = Date.now();
  sessions.set(session.phoneNumber, session);
}
