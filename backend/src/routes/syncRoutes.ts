import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { enqueueStepEvent } from '../cce/outboxWorker.js';

export const syncRouter = Router();

/**
 * PUSH: Mobile client replays offline outbox mutations to backend.
 */
syncRouter.post('/push', (req: Request, res: Response) => {
  const { steps, patients, actorId, actorName } = req.body;
  const now = new Date().toISOString();

  let enqueuedCount = 0;

  try {
    // 1. Process new/updated patients
    if (Array.isArray(patients)) {
      const patientStmt = db.prepare(`
        INSERT INTO patients (
          id, name, name_hi, phone, service, village_id, village_name,
          subcentre_id, asha_name, status, age, lmp, edd, dod, consent_whatsapp, abha_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          status = excluded.status,
          consent_whatsapp = excluded.consent_whatsapp
      `);

      for (const p of patients) {
        patientStmt.run(
          p.id,
          p.name,
          p.name_hi || null,
          p.phone,
          p.service || 'ANC',
          p.village_id || null,
          p.village_name || 'Village',
          p.subcentre_id || null,
          p.asha_name || null,
          p.status || 'NORMAL',
          p.age || null,
          p.lmp || null,
          p.edd || null,
          p.dod || null,
          p.consent_whatsapp !== undefined ? (p.consent_whatsapp ? 1 : 0) : 1,
          p.abha_id || null,
          p.created_at || now
        );
      }
    }

    // 2. Process steps & enqueue to CCE
    if (Array.isArray(steps)) {
      const stepStmt = db.prepare(`
        INSERT INTO steps (
          id, patient_id, cat, level, due, sent_at, status, owner_role,
          created_by, closed_at, closed_by, closed_source, closed_level,
          downgraded, reminder_state, unreach_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          closed_at = excluded.closed_at,
          closed_by = excluded.closed_by,
          closed_source = excluded.closed_source,
          closed_level = excluded.closed_level,
          downgraded = excluded.downgraded,
          reminder_state = excluded.reminder_state,
          unreach_count = excluded.unreach_count,
          updated_at = excluded.updated_at
      `);

      for (const s of steps) {
        const existing = db.prepare('SELECT cat, level, due, sent_at, owner_role, created_by, created_at FROM steps WHERE id = ?').get(s.id) as any;
        const resolvedCat = s.cat || existing?.cat || 'REFERRAL';
        const resolvedLevel = s.level || existing?.level || 'CHC';
        const resolvedDue = s.due || existing?.due || null;
        const resolvedSent = s.sent_at || existing?.sent_at || null;
        const resolvedOwner = s.owner_role || existing?.owner_role || 'anm';
        const resolvedCreatedBy = s.created_by || existing?.created_by || actorName || null;
        const resolvedCreatedAt = s.created_at || existing?.created_at || now;

        stepStmt.run(
          s.id,
          s.patient_id,
          resolvedCat,
          resolvedLevel,
          resolvedDue,
          resolvedSent,
          s.status || 'OPEN',
          resolvedOwner,
          resolvedCreatedBy,
          s.closed_at || null,
          s.closed_by || null,
          s.closed_source || null,
          s.closed_level || null,
          s.downgraded ? 1 : 0,
          s.reminder_state || null,
          s.unreach_count || 0,
          resolvedCreatedAt,
          now
        );

        // Enqueue event to CCE Outbox
        enqueueStepEvent({
          id: s.id,
          patient_id: s.patient_id,
          cat: resolvedCat,
          level: resolvedLevel,
          due: resolvedDue,
          sent_at: resolvedSent,
          status: s.status || 'OPEN',
          owner_role: resolvedOwner,
          closed_at: s.closed_at,
          closed_by: s.closed_by,
          closed_source: s.closed_source,
          closed_level: s.closed_level,
        });
        enqueuedCount++;
      }
    }

    // Log audit
    const auditStmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    auditStmt.run(
      `aud-${Date.now()}`,
      actorId || 'mobile-sync',
      actorName || 'Mobile Worker',
      'SYNC_PUSH',
      `Synchronized ${(patients || []).length} patients and ${(steps || []).length} steps. Enqueued ${enqueuedCount} CCE events.`,
      now
    );

    res.json({
      success: true,
      receivedPatients: (patients || []).length,
      receivedSteps: (steps || []).length,
      cceEventsEnqueued: enqueuedCount,
      serverTime: now,
    });
  } catch (err: any) {
    console.error('[Sync Push Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PULL: Hydrate mobile app or retrieve latest server state.
 */
syncRouter.get('/pull', (req: Request, res: Response) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC LIMIT 100').all();
    const steps = db.prepare('SELECT * FROM steps ORDER BY updated_at DESC LIMIT 200').all();
    const facilities = db.prepare('SELECT * FROM facilities ORDER BY name ASC').all();
    const villages = db.prepare('SELECT * FROM villages ORDER BY name ASC').all();
    const configRows = db.prepare('SELECT * FROM deployment_config').all() as any[];

    const deploymentConfig: Record<string, string> = {};
    for (const r of configRows) {
      deploymentConfig[r.key] = r.value;
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      patients,
      steps,
      facilities,
      villages,
      config: deploymentConfig,
    });
  } catch (err: any) {
    console.error('[Sync Pull Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
