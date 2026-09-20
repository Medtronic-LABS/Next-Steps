import { renderMenu, renderMenuFlow } from '../adapter/MessageRenderer.js';
import { getFacilityById } from '../domain/FacilityService.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';
import type { User } from '../domain/types.js';

export async function handleMenuCommand(to: string, user: User): Promise<OutboundMessage[]> {
  const facility = await getFacilityById(user.facilityId);
  const facilityName = facility?.name ?? user.facilityId;
  const flowId = process.env.FLOW_MENU_ID;
  if (flowId) return [renderMenuFlow(to, flowId, user, facilityName)];
  return [renderMenu(to, user, facilityName)];
}
