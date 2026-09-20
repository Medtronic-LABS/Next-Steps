import { onSchedule } from 'firebase-functions/v2/scheduler';
import { dispatchOverdueAlerts } from '../domain/AlertService.js';
import { whatsappAccessToken, whatsappPhoneNumberId } from '../config/secrets.js';

/**
 * Daily cadence (spec §17). The schedule is a deployment choice, not a domain
 * rule — dispatchOverdueAlerts() itself has no notion of "once a day" beyond
 * the per-step SENT dedupe it already enforces.
 */
export const overdueAlerts = onSchedule(
  { schedule: 'every day 08:00', secrets: [whatsappPhoneNumberId, whatsappAccessToken] },
  async () => {
    await dispatchOverdueAlerts();
  },
);
