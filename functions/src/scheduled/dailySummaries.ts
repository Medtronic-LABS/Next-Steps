import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { dispatchExpectedArrivalsSummaries, dispatchWorkDueTodaySummaries } from '../domain/AlertService.js';
import { whatsappAccessToken, whatsappPhoneNumberId } from '../config/secrets.js';

/**
 * Daily proactive push (spec §16) for the two summary templates that
 * complement the interactive menu: work_due_today_v1 (ANMs) and
 * expected_arrivals_summary_v1 (receiving-facility staff nurses).
 */
export const dailySummaries = onSchedule(
  { schedule: 'every day 08:00', secrets: [whatsappPhoneNumberId, whatsappAccessToken] },
  async () => {
    const [workDueToday, expectedArrivals] = await Promise.all([
      dispatchWorkDueTodaySummaries(),
      dispatchExpectedArrivalsSummaries(),
    ]);
    logger.info('dailySummaries: dispatched', {
      workDueToday: workDueToday.length,
      expectedArrivals: expectedArrivals.length,
    });
  },
);
