import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { drainCCEOutbox } from '../domain/CCEOutboxService.js';

/**
 * Drains the CCE outbox every 5 minutes (spec §14) — no CCE endpoint exists
 * for this synthetic MVP yet, so CCEClient defaults to an in-memory mock
 * (adapter/CCEClient.ts) until CCE_ENDPOINT_URL/CCE_API_KEY are configured.
 */
export const cceOutboxConsumer = onSchedule('every 5 minutes', async () => {
  const { sent, failed } = await drainCCEOutbox();
  if (sent > 0 || failed > 0) {
    logger.info('cceOutboxConsumer: drained outbox', { sent, failed });
  }
});
