import { randomUUID } from 'node:crypto';
import { getDb, Collections } from './firestore.js';
import { getUserById, listActiveUsersByRole } from './UserService.js';
import { getPatientById } from './PatientService.js';
import { getFacilityById } from './FacilityService.js';
import { getWorklistSummary, getOverdueSteps } from './WorklistService.js';
import { getExpectedArrivals } from './ArrivalService.js';
import { getWhatsAppClient } from '../adapter/WhatsAppClient.js';
import {
  renderExpectedArrivalsSummary,
  renderOverdueAlert,
  renderWorkDueTodaySummary,
} from '../adapter/MessageRenderer.js';
import type { CareStep, Patient } from './types.js';

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

export type DailySummaryTemplate = 'work_due_today_v1' | 'expected_arrivals_summary_v1';

/** A user-level (not step-level) proactive push — one per recipient per day, not one per step. */
export interface DailySummaryAlert {
  id: string;
  recipientUserId: string;
  template: DailySummaryTemplate;
  count: number;
  sentAt: string;
  deliveryStatus: AlertStatus;
}

export type AnyAlert = OverdueAlert | DailySummaryAlert;

/** "Alerts" menu item (read-only history) — most recent first, in memory since the alerts collection is small per user. */
export async function getRecentAlertsForUser(userId: string, limit = 10): Promise<AnyAlert[]> {
  const snap = await getDb().collection(Collections.alerts).where('recipientUserId', '==', userId).get();
  const alerts = snap.docs.map((doc) => doc.data() as AnyAlert);
  return alerts.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1)).slice(0, limit);
}

/**
 * Proactive alert shown "as though OpenPHC has proactively messaged them"
 * when the user opens the demo (addendum §10). Deliberately not read from
 * the `alerts` collection — whether an alert is still active is derived
 * from the step's current status (still OPEN and overdue), so it
 * automatically disappears the moment the underlying step is closed,
 * without needing a separate resolve-the-alert step anywhere.
 */
export async function getActiveOverdueAlertForUser(
  userId: string,
): Promise<{ step: CareStep; patient: Patient } | null> {
  const overdueSteps = await getOverdueSteps(userId);
  if (overdueSteps.length === 0) return null;

  const step = overdueSteps[0]!;
  const patient = await getPatientById(step.patientId);
  if (!patient) return null;

  return { step, patient };
}


function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysOverdue(dueDate: string): number {
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

async function alreadySentSummaryToday(recipientUserId: string, template: DailySummaryTemplate): Promise<boolean> {
  const today = todayIso();
  const snap = await getDb()
    .collection(Collections.alerts)
    .where('recipientUserId', '==', recipientUserId)
    .where('template', '==', template)
    .where('deliveryStatus', '==', 'SENT')
    .get();
  return snap.docs.some((doc) => (doc.data() as DailySummaryAlert).sentAt.slice(0, 10) === today);
}

/**
 * Daily push to each active ANM with at least one step due today (spec §16
 * `work_due_today_v1`). Complements the interactive "Today's work" menu item
 * — this is the proactive half.
 */
export async function dispatchWorkDueTodaySummaries(): Promise<DailySummaryAlert[]> {
  const anms = await listActiveUsersByRole('ANM');
  const results: DailySummaryAlert[] = [];

  for (const user of anms) {
    if (await alreadySentSummaryToday(user.id, 'work_due_today_v1')) continue;

    const { dueToday } = await getWorklistSummary(user.id);
    if (dueToday.length === 0) continue;

    const alert: DailySummaryAlert = {
      id: randomUUID(),
      recipientUserId: user.id,
      template: 'work_due_today_v1',
      count: dueToday.length,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'SENT',
    };

    try {
      await getWhatsAppClient().send(renderWorkDueTodaySummary(user.phoneNumber, dueToday.length));
    } catch {
      alert.deliveryStatus = 'FAILED';
    }

    await getDb().collection(Collections.alerts).doc(alert.id).set(alert);
    results.push(alert);
  }
  return results;
}

/**
 * Daily push to each active STAFF_NURSE whose facility has at least one
 * expected (not-yet-arrived) referral (spec §16 `expected_arrivals_summary_v1`).
 * Complements the interactive "Expected arrivals" menu item.
 */
export async function dispatchExpectedArrivalsSummaries(): Promise<DailySummaryAlert[]> {
  const nurses = await listActiveUsersByRole('STAFF_NURSE');
  const results: DailySummaryAlert[] = [];

  for (const user of nurses) {
    if (await alreadySentSummaryToday(user.id, 'expected_arrivals_summary_v1')) continue;

    const expected = await getExpectedArrivals(user.facilityId);
    if (expected.length === 0) continue;

    const facility = await getFacilityById(user.facilityId);
    const alert: DailySummaryAlert = {
      id: randomUUID(),
      recipientUserId: user.id,
      template: 'expected_arrivals_summary_v1',
      count: expected.length,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'SENT',
    };

    try {
      await getWhatsAppClient().send(
        renderExpectedArrivalsSummary(user.phoneNumber, expected.length, facility?.name ?? user.facilityId),
      );
    } catch {
      alert.deliveryStatus = 'FAILED';
    }

    await getDb().collection(Collections.alerts).doc(alert.id).set(alert);
    results.push(alert);
  }
  return results;
}
