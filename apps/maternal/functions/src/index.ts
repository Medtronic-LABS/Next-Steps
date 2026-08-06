/**
 * Next Steps for Maternal Care — Cloud Functions.
 *
 * Coordination data only. These four functions carry the server-side logic from
 * pwa-plan.md §6:
 *   onStepWrite       — schedule reminders per config.intervals; fan out referrals
 *   sweepEscalations  — daily: raise overdue / referral-stale / not-done alerts
 *   dispatchReminders — hourly: send due reminders in quiet hours, 1/step/day
 *   buildPmsmaSession — monthly: assemble the PMSMA list for each PHC
 *
 * Region: asia-south1 (data residency).
 */
import { setGlobalOptions, logger } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const db = getFirestore();
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID ?? 'pilot-rewa';

interface Intervals {
  referralStaleDays: number;
  notDoneDays: number;
  overdueAlertDays: number;
}
interface DeploymentConfig {
  pmsmaDay: number;
  intervals: Intervals;
  villages: { name: string; asha: string; ashaPhone?: string }[];
}

const DEFAULTS: DeploymentConfig = {
  pmsmaDay: 9,
  intervals: { referralStaleDays: 7, notDoneDays: 7, overdueAlertDays: 3 },
  villages: [],
};

async function loadConfig(): Promise<DeploymentConfig> {
  const snap = await db.doc(`config/${DEPLOYMENT_ID}`).get();
  return snap.exists ? ({ ...DEFAULTS, ...(snap.data() as DeploymentConfig) }) : DEFAULTS;
}

const dayMs = 86_400_000;
const daysSince = (t?: Timestamp | null): number =>
  t ? Math.floor((Date.now() - t.toMillis()) / dayMs) : 0;

/* ------------------------------------------------------------------ *
 * onStepWrite — schedule reminders + fan out referrals to a worklist.
 * ------------------------------------------------------------------ */
export const onStepWrite = onDocumentWritten('women/{womanId}/steps/{stepId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return; // deleted — nothing to do
  const step = after.data() as Record<string, unknown>;
  const { womanId, stepId } = event.params;

  if (step.status !== 'OPEN') return;

  const cfg = await loadConfig();

  // 1) Schedule a reminder for dated steps (skipped for referrals — the facility
  //    schedules those). Reminders are picked up by dispatchReminders.
  if (step.due && step.cat !== 'REFERRAL') {
    const reminderId = `${womanId}_${stepId}`;
    await db.doc(`reminders/${reminderId}`).set(
      {
        womanId, stepId,
        channel: 'whatsapp',
        templateId: `reminder_${String(step.cat).toLowerCase()}`,
        scheduledFor: step.due,
        state: 'SCHEDULED',
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    logger.info(`Scheduled reminder ${reminderId} for ${step.due}`);
  }

  // 2) Fan a referral out to the target level's worklist so the receiving
  //    facility sees it immediately.
  if (step.cat === 'REFERRAL' && step.level) {
    await db.collection('worklistFanout').add({
      womanId, stepId, level: step.level, sentAt: step.sent ?? null,
      staleAfterDays: cfg.intervals.referralStaleDays, createdAt: FieldValue.serverTimestamp(),
    });
    logger.info(`Referral ${stepId} routed to ${step.level}`);
  }
});

/* ------------------------------------------------------------------ *
 * sweepEscalations — daily alert raising, routed to her home sub-centre.
 * ------------------------------------------------------------------ */
export const sweepEscalations = onSchedule('every day 06:00', async () => {
  const cfg = await loadConfig();
  const openSteps = await db.collectionGroup('steps').where('status', '==', 'OPEN').get();
  let raised = 0;

  for (const doc of openSteps.docs) {
    const s = doc.data() as Record<string, unknown>;
    const womanRef = doc.ref.parent.parent;
    if (!womanRef) continue;
    const womanSnap = await womanRef.get();
    const woman = womanSnap.data() as Record<string, unknown> | undefined;
    if (!woman) continue;

    let type: string | null = null;
    if (s.cat === 'REFERRAL') {
      if (daysSince(s.sent as Timestamp) >= cfg.intervals.referralStaleDays) type = 'REFERRAL_STALE';
    } else if (!s.due) {
      if (daysSince(s.sent as Timestamp) >= cfg.intervals.notDoneDays) type = 'NOT_DONE';
    } else if (s.rem === 'failed') {
      type = 'UNREACHABLE';
    } else if (daysSince(s.due as Timestamp) >= cfg.intervals.overdueAlertDays) {
      type = 'STEP_OVERDUE';
    }
    if (!type) continue;

    const alertId = `${womanRef.id}_${doc.id}_${type}`;
    const linkedAsha = cfg.villages.find((v) => v.name === woman.village)?.asha ?? null;
    await db.doc(`alerts/${alertId}`).set(
      {
        womanId: womanRef.id, stepId: doc.id, type,
        level: s.level ?? null,
        // Alerts route to *her* home sub-centre (BR-019) — never a facility score.
        facilityId: woman.homeSubcentreId ?? null,
        linkedAsha,
        resolvedAt: null,
        raisedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    raised++;
  }
  logger.info(`sweepEscalations: ${raised} alert(s) raised`);
});

/* ------------------------------------------------------------------ *
 * dispatchReminders — hourly send within quiet hours, max 1/step/day.
 * ------------------------------------------------------------------ */
export const dispatchReminders = onSchedule('every 1 hours', async () => {
  // Quiet hours: only send 09:00–19:00 IST.
  const istHour = (new Date().getUTCHours() + 5) % 24; // +5:30 rounded to the hour band
  if (istHour < 9 || istHour >= 19) {
    logger.info('Outside quiet hours — skipping dispatch');
    return;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const due = await db.collection('reminders')
    .where('state', '==', 'SCHEDULED')
    .where('scheduledFor', '<=', todayIso)
    .limit(200)
    .get();

  let sent = 0;
  for (const doc of due.docs) {
    const r = doc.data() as Record<string, unknown>;
    // Enforce max 1 send per step per day.
    if (r.lastSentDay === todayIso) continue;

    // TODO: integrate the DLT-registered SMS / WhatsApp Business provider here.
    // await provider.send({ to, templateId: r.templateId, lang: 'hi' });

    await doc.ref.set(
      { state: 'SENT', lastSentDay: todayIso, sentAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    sent++;
  }
  logger.info(`dispatchReminders: ${sent} reminder(s) sent`);
});

/* ------------------------------------------------------------------ *
 * buildPmsmaSession — monthly PMSMA list for the configured day at each PHC.
 * ------------------------------------------------------------------ */
export const buildPmsmaSession = onSchedule('0 0 1 * *', async () => {
  const cfg = await loadConfig();
  const day = Math.min(28, Math.max(1, cfg.pmsmaDay || 9));
  const now = new Date();
  const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
    .toISOString().slice(0, 10);

  const pmsmaSteps = await db.collectionGroup('steps')
    .where('cat', '==', 'PMSMA_VISIT')
    .where('status', '==', 'OPEN')
    .get();

  // Group by PHC (step.level facility).
  const byPhc = new Map<string, { womanId: string; stepId: string }[]>();
  for (const doc of pmsmaSteps.docs) {
    const s = doc.data() as Record<string, unknown>;
    const phc = String(s.level ?? 'PHC');
    const womanRef = doc.ref.parent.parent;
    if (!womanRef) continue;
    const list = byPhc.get(phc) ?? [];
    list.push({ womanId: womanRef.id, stepId: doc.id });
    byPhc.set(phc, list);
  }

  for (const [phc, women] of byPhc) {
    await db.doc(`pmsmaSessions/${sessionDate}_${phc}`).set({
      sessionDate, phc, count: women.length, women,
      builtAt: FieldValue.serverTimestamp(),
    });
  }
  logger.info(`buildPmsmaSession: ${byPhc.size} PHC session(s) for ${sessionDate}`);
});
