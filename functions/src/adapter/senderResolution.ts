import { resolveUser } from '../domain/UserService.js';
import type { User } from '../domain/types.js';

/** WhatsApp sends the sender's number without a leading "+" (e.g. "919876543210"). */
export function normalizeWhatsAppNumber(rawFrom: string): string {
  const digitsOnly = rawFrom.replace(/[^\d]/g, '');
  return `+${digitsOnly}`;
}

/** Resolves a WhatsApp webhook "from" field to a seeded Firebase user, or null (spec §11). */
export async function resolveSender(rawFrom: string): Promise<User | null> {
  return resolveUser(normalizeWhatsAppNumber(rawFrom));
}
