import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { checkKeycloakHealth } from '../cce/cceAuth.js';
import { checkGatewayHealth, publishEventToCce } from '../cce/ccePublisher.js';
import { getOutboxStats, retryFailedEvents } from '../cce/outboxWorker.js';
import { transformStepToCloudEvent } from '../cce/cceTransformer.js';

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Live System & CCE Status Overview
 */
adminRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const keycloakHealth = await checkKeycloakHealth();
    const gatewayHealth = await checkGatewayHealth();
    const outboxStats = getOutboxStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      cce: {
        keycloak: keycloakHealth,
        gateway: gatewayHealth,
      },
      outbox: outboxStats,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * List Outbox Events with filtering and pagination
 */
adminRouter.get('/outbox', (req: Request, res: Response) => {
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string || '50', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  let query = 'SELECT * FROM cce_event_outbox';
  const params: any[] = [];

  if (status && status !== 'ALL') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const events = db.prepare(query).all(...params);
  const total = (db.prepare('SELECT COUNT(*) as count FROM cce_event_outbox').get() as any).count;

  res.json({
    success: true,
    total,
    events,
  });
});

/**
 * Manually Retry Failed Events
 */
adminRouter.post('/outbox/retry', (req: Request, res: Response) => {
  const count = retryFailedEvents();
  res.json({ success: true, resetCount: count });
});

/**
 * Send an on-demand live test CloudEvent to CCE Gateway
 */
adminRouter.post('/outbox/test-event', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const testStep = {
    id: `test-step-${uuidv4().slice(0, 8)}`,
    patient_id: req.body.patientId || 'Patient/w1',
    cat: req.body.category || 'REFERRAL',
    level: req.body.level || 'CHC',
    status: 'OPEN',
    owner_role: 'anm',
    facility_id: 'PHC-SIRMOUR',
  };

  const cloudEvent = transformStepToCloudEvent(testStep);
  const result = await publishEventToCce(cloudEvent);

  // Store in outbox as delivered or failed
  const outboxId = uuidv4();
  const outboxStatus = result.success ? 'DELIVERED' : 'FAILED';
  db.prepare(`
    INSERT INTO cce_event_outbox (
      id, event_id, cloud_events_id, cce_ack_event_id, event_type, subject, facility_id,
      correlation_id, payload, status, attempts, last_error, created_at, delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    outboxId,
    cloudEvent.id,
    cloudEvent.id,
    result.data?.eventId || null,
    cloudEvent.type,
    cloudEvent.subject,
    cloudEvent.facilityid,
    cloudEvent.correlationid,
    JSON.stringify(cloudEvent),
    outboxStatus,
    result.error ? result.error.message : null,
    now,
    result.success ? now : null
  );

  res.json({
    success: result.success,
    result,
    cloudEvent,
  });
});

/**
 * User & Persona Management
 */
adminRouter.get('/users', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.*, f.name as facility_name
    FROM users u
    LEFT JOIN facilities f ON u.facility_id = f.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ success: true, users });
});

adminRouter.post('/users', (req: Request, res: Response) => {
  const { name, phone, role, facility_id } = req.body;
  if (!name || !phone || !role) {
    return res.status(400).json({ success: false, error: 'Name, phone, and role are required' });
  }

  const id = `USR-${role.toUpperCase()}-${uuidv4().slice(0, 6)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, name, phone, role, facility_id, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, phone, role, facility_id || null, now);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.put('/users/:id/toggle', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const newStatus = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, id);

  res.json({ success: true, is_active: newStatus });
});

/**
 * Facilities
 */
adminRouter.get('/facilities', (req: Request, res: Response) => {
  const facilities = db.prepare('SELECT * FROM facilities ORDER BY name ASC').all();
  res.json({ success: true, facilities });
});

/**
 * Villages & Catchment
 */
adminRouter.get('/villages', (req: Request, res: Response) => {
  const villages = db.prepare(`
    SELECT v.*, f.name as subcentre_name, f.block, f.district
    FROM villages v
    LEFT JOIN facilities f ON v.subcentre_id = f.id
    ORDER BY v.name ASC
  `).all();
  res.json({ success: true, villages });
});

/**
 * Bulk CSV Upload for Villages, ASHA Linkage & Sub-centres
 */
adminRouter.post('/upload-csv', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const now = new Date().toISOString();
    let insertedCount = 0;

    const insertVillage = db.prepare(`
      INSERT INTO villages (id, name, subcentre_id, asha_name, asha_phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        asha_name = excluded.asha_name,
        asha_phone = excluded.asha_phone
    `);

    for (const r of records) {
      // Expected headers: Village Name, ASHA Name, ASHA Phone, Subcentre ID
      const name = r['Village Name'] || r['village_name'] || r['Village'] || r['name'];
      const ashaName = r['ASHA Name'] || r['asha_name'] || r['ASHA'] || 'Unassigned';
      const ashaPhone = r['ASHA Phone'] || r['asha_phone'] || r['Phone'] || '+910000000000';
      const subcentreId = r['Subcentre ID'] || r['subcentre_id'] || r['Subcentre'] || 'FAC-SC-GHU';

      if (!name) continue;

      const id = `VIL-${name.replace(/\s+/g, '-').toUpperCase().slice(0, 16)}`;
      insertVillage.run(id, name, subcentreId, ashaName, ashaPhone, now);
      insertedCount++;
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `aud-${Date.now()}`,
      'admin',
      'Administrator',
      'BULK_CSV_UPLOAD',
      `Imported/updated ${insertedCount} villages from CSV file: ${req.file.originalname}`,
      now
    );

    res.json({ success: true, processedRecords: insertedCount });
  } catch (err: any) {
    console.error('[CSV Upload Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Deployment Configuration
 */
adminRouter.get('/config', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM deployment_config').all() as any[];
  const configMap: Record<string, string> = {};
  for (const r of rows) configMap[r.key] = r.value;
  res.json({ success: true, config: configMap });
});

adminRouter.put('/config', (req: Request, res: Response) => {
  const updates = req.body;
  const upsert = db.prepare(`
    INSERT INTO deployment_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [k, v] of Object.entries(updates)) {
    upsert.run(k, String(v));
  }

  res.json({ success: true });
});

/**
 * Audit Logs
 */
adminRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json({ success: true, logs });
});
