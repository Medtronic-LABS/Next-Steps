import { randomUUID } from 'node:crypto';
import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { getPatientById } from './PatientService.js';
import { getWhatsAppClient } from '../adapter/WhatsAppClient.js';
import { renderOverdueAlert } from '../adapter/MessageRenderer.js';
import type { CareStep } from './types.js';

export type AlertStatus = 'SENT' | 'FAILED';

export interface OverdueAlert {
  id: string;
  stepId: string;
  patientId: string;
  recipientUserId: string;
  template: 'care_step_overdue_v1';
  sentAt: string; // ISO
  deliveryStatus: AlertStatus;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysOverdue(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((today - due) / (24 * 60 * 60 * 1000)));
}

async function getAllOpenSteps(): Promise<CareStep[]> {
  const snap = await getDb().collection(Collections.careSteps).where('status', '==', 'OPEN').get();
  return snap.docs.map((doc) => doc.data() as CareStep);
}

/**
 * Spec §18/§17 "do not send duplicate alerts" — only a *successful* send for
 * this step today counts as already-alerted. A prior FAILED attempt remains
 * eligible so the next scheduled run retries it (spec §17 retry/status
 * tracking).
 */
async function alreadySentToday(stepId: string): Promise<boolean> {
  const today = todayIso();
  const snap = await getDb()
    .collection(Collections.alerts)
    .where('stepId', '==', stepId)
    .where('template', '==', 'care_step_overdue_v1')
    .where('deliveryStatus', '==', 'SENT')
    .get();
  return snap.docs.some((doc) => (doc.data() as OverdueAlert).sentAt.slice(0, 10) === today);
}

/**
 * Firebase scheduled function entry point (spec §17): find overdue open
 * steps, check recipient eligibility, and send one `care_step_overdue_v1`
 * template alert per step per day.
 */
export async function dispatchOverdueAlerts(): Promise<OverdueAlert[]> {
  const today = todayIso();
  const overdueSteps = (await getAllOpenSteps()).filter((s) => s.dueDate < today);

  const results: OverdueAlert[] = [];
  for (const step of overdueSteps) {
    if (await alreadySentToday(step.id)) continue;

    // "Check worker eligibility" (spec §17) — an inactive owner receives nothing.
    const recipient = await getUserById(step.ownerUserId);
    if (!recipient || recipient.status !== 'ACTIVE') continue;

    const patient = await getPatientById(step.patientId);
    if (!patient) continue;

    const alert: OverdueAlert = {
      id: randomUUID(),
      stepId: step.id,
      patientId: step.patientId,
      recipientUserId: recipient.id,
      template: 'care_step_overdue_v1',
      sentAt: new Date().toISOString(),
      deliveryStatus: 'SENT',
    };

    try {
      await getWhatsAppClient().send(
        renderOverdueAlert(
          recipient.phoneNumber,
          patient.displayName,
          step.kind,
          step.dueDate,
          daysOverdue(step.dueDate),
        ),
      );
    } catch {
      alert.deliveryStatus = 'FAILED';
    }

    await getDb().collection(Collections.alerts).doc(alert.id).set(alert);
    results.push(alert);
  }
  return results;
}
