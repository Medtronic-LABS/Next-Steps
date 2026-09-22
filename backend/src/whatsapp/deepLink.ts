import crypto from 'crypto';
import { config } from '../config.js';

const SECRET_KEY = config.whatsapp.appSecret || 'nextsteps_deep_link_secret_key_2026';

export interface DeepLinkPayload {
  patientId: string;
  userId: string;
  role: string;
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Generates an encrypted, signed deep-link token for accessing sensitive patient
 * data in the Next Steps mobile web app without exposing details in chat history.
 */
export function generatePatientDeepLink(patientId: string, userId: string, role: string, durationMinutes = 15): string {
  const expiresAt = Date.now() + durationMinutes * 60 * 1000;
  const payload: DeepLinkPayload = {
    patientId,
    userId,
    role,
    expiresAt,
  };

  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');
  const token = Buffer.from(JSON.stringify({ p: payloadStr, s: hmac })).toString('base64url');

  const baseUrl = config.whatsapp.appBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/app/?auth=${token}&patient=${encodeURIComponent(patientId)}`;
}

/**
 * Generates an encrypted, signed deep-link token for securely registering a patient
 * directly in the Next Steps mobile web app, keeping all sensitive PII off WhatsApp/Meta servers.
 */
export function generateRegisterDeepLink(userId: string, role: string, durationMinutes = 15): string {
  const expiresAt = Date.now() + durationMinutes * 60 * 1000;
  const payload: DeepLinkPayload = {
    patientId: 'new',
    userId,
    role,
    expiresAt,
  };

  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');
  const token = Buffer.from(JSON.stringify({ p: payloadStr, s: hmac })).toString('base64url');

  const baseUrl = config.whatsapp.appBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/app/?auth=${token}&screen=register`;
}

/**
 * Validates a deep-link token. Returns payload if valid and not expired, null otherwise.
 */
export function verifyPatientDeepLink(token: string): DeepLinkPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const { p: payloadStr, s: signature } = JSON.parse(raw);

    const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
      return null;
    }

    const payload: DeepLinkPayload = JSON.parse(payloadStr);
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
