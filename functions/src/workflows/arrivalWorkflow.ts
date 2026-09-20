import { getExpectedArrivals, recordArrival } from '../domain/ArrivalService.js';
import { getUserById } from '../domain/UserService.js';
import { getPatientById } from '../domain/PatientService.js';
import { DomainError } from '../domain/types.js';
import { renderArrivalRecorded, renderExpectedArrivals } from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export async function handleExpectedArrivalsCommand(
  to: string,
  whatsappSenderId: string,
  actorUserId: string,
): Promise<OutboundMessage[]> {
  const actor = await getUserById(actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const steps = await getExpectedArrivals(actor.facilityId);
  const patients = await Promise.all([...new Set(steps.map((s) => s.patientId))].map((id) => getPatientById(id)));
  const namesById = Object.fromEntries(
    patients.filter((p): p is NonNullable<typeof p> => p !== null).map((p) => [p.id, p.displayName]),
  );
  return [await renderExpectedArrivals(to, whatsappSenderId, namesById, steps)];
}

export async function handleConfirmArrival(
  to: string,
  actorUserId: string,
  stepId: string,
): Promise<OutboundMessage[]> {
  const step = await recordArrival({ actorUserId, stepId });
  const patient = await getPatientById(step.patientId);
  return [renderArrivalRecorded(to, patient?.displayName ?? step.patientId)];
}
