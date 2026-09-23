import { ConversationSession } from './types.js';

const sessions = new Map<string, ConversationSession>();
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

function normalizeKey(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length > 10 ? digits : `91${digits}`;
}

export function getSession(phoneNumber: string, userId: string, initialLang: 'hi' | 'en' = 'hi'): ConversationSession {
  const key = normalizeKey(phoneNumber);
  const existing = sessions.get(key);
  const now = Date.now();

  if (existing && now - existing.lastActiveAt < SESSION_TTL_MS) {
    existing.lastActiveAt = now;
    if (!existing.lang) {
      existing.lang = initialLang;
    }
    return existing;
  }

  const newSession: ConversationSession = {
    userId,
    phoneNumber,
    currentState: 'IDLE',
    lang: initialLang,
    lastActiveAt: now,
  };

  sessions.set(key, newSession);
  return newSession;
}

export function updateSession(session: ConversationSession): void {
  session.lastActiveAt = Date.now();
  sessions.set(normalizeKey(session.phoneNumber), session);
}

export function clearSession(phoneNumber: string): void {
  sessions.delete(normalizeKey(phoneNumber));
}

export function resetSession(session: ConversationSession): void {
  const currentLang = session.lang || 'hi';
  session.currentState = 'IDLE';
  session.patientId = undefined;
  session.stepId = undefined;
  session.stagedAction = undefined;
  session.stagedSteps = undefined;
  session.stagedRegistration = undefined;
  session.lang = currentLang;
  session.lastActiveAt = Date.now();
  sessions.set(normalizeKey(session.phoneNumber), session);
}
