import { renderMenu, renderMenuFlow, renderOpenAlertCard } from '../adapter/MessageRenderer.js';
import { getFacilityById } from '../domain/FacilityService.js';
import { daysOverdue, getActiveOverdueAlertForUser } from '../domain/AlertService.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';
import type { User } from '../domain/types.js';

export async function handleMenuCommand(to: string, user: User): Promise<OutboundMessage[]> {
  const facility = await getFacilityById(user.facilityId);
  const facilityName = facility?.name ?? user.facilityId;
  const flowId = process.env.FLOW_MENU_ID;
  const menuMessage = flowId ? renderMenuFlow(to, flowId, user, facilityName) : renderMenu(to, user, facilityName);

  // Proactive alert "as though OpenPHC has proactively messaged them"
  // (addendum §10) — active exactly when the underlying step is still
  // overdue, so it stops appearing the moment that step is closed.
  const active = await getActiveOverdueAlertForUser(user.id);
  if (!active) return [menuMessage];

  const alertCard = await renderOpenAlertCard(
    to,
    to,
    active.patient.id,
    active.step.id,
    active.patient.displayName,
    active.step.kind,
    active.step.dueDate,
    daysOverdue(active.step.dueDate),
  );
  return [alertCard, menuMessage];
}
