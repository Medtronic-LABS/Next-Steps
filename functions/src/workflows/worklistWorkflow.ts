import { getWorklistSummary } from '../domain/WorklistService.js';
import { getPatientById } from '../domain/PatientService.js';
import { renderWorklist, renderWorklistFlow } from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleWorklistCommand(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
): Promise<OutboundMessage[]> {
  const summary = await getWorklistSummary(actorUserId);
  const patientIds = [...new Set([...summary.overdue, ...summary.dueToday].map((s) => s.patientId))];
  const patients = await Promise.all(patientIds.map((id) => getPatientById(id)));
  const namesById = Object.fromEntries(
    patients.filter((p): p is NonNullable<typeof p> => p !== null).map((p) => [p.id, p.displayName]),
  );
  const flowId = process.env.FLOW_SELECT_ITEM_ID;
  if (flowId) return [renderWorklistFlow(to, flowId, namesById, summary)];
  return [await renderWorklist(to, whatsappSenderId, actorUserId, namesById, summary)];
}
