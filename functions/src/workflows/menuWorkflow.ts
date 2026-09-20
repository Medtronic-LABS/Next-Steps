import { renderMenu } from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';
import type { User } from '../domain/types.js';

export function handleMenuCommand(to: string, user: User): OutboundMessage[] {
  return [renderMenu(to, user.role)];
}
