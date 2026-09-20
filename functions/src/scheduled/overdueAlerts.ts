import { onSchedule } from 'firebase-functions/v2/scheduler';
import { dispatchOverdueAlerts } from '../domain/AlertService.js';

/**
 * Daily cadence (spec §17). The schedule is a deployment choice, not a domain
 * rule — dispatchOverdueAlerts() itself has no notion of "once a day" beyond
 * the per-step SENT dedupe it already enforces.
 */
export const overdueAlerts = onSchedule('every day 08:00', async () => {
  await dispatchOverdueAlerts();
});
