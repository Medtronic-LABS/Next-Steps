import { renderMenu } from '../adapter/MessageRenderer.js';
import { getFacilityById } from '../domain/FacilityService.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';
import type { User } from '../domain/types.js';

export async function handleMenuCommand(to: string, user: User): Promise<OutboundMessage[]> {
  const facility = await getFacilityById(user.facilityId);
  return [renderMenu(to, user, facility?.name ?? user.facilityId)];
}
