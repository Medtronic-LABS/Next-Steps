import { getRecentAlertsForUser } from '../domain/AlertService.js';
import { renderAlertHistory } from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleAlertsCommand(to: string, actorUserId: string): Promise<OutboundMessage[]> {
  const alerts = await getRecentAlertsForUser(actorUserId);
  return [renderAlertHistory(to, alerts)];
}
