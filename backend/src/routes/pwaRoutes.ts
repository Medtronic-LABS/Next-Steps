import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

/**
 * Storage for the ai-care-demo PWA. Each beneficiary record (with its steps) is kept as one JSON row,
 * so the PWA's data model can evolve without schema changes. Nothing here is sent to the CCE.
 */
export const pwaRouter = Router();

const MAX_RECORDS_PER_PUT = 2000;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** GET /api/pwa/records — every stored record, oldest first. */
pwaRouter.get('/records', (req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT data FROM pwa_records ORDER BY rowid ASC').all() as { data: string }[];
    res.json({ success: true, records: rows.map((r) => JSON.parse(r.data)) });
  } catch (err: any) {
    console.error('[PWA Records Read Error]:', err);
    res.status(500).json({ success: false, error: 'Could not read records' });
  }
});

/** PUT /api/pwa/records — insert or replace the records sent, matched by id. */
pwaRouter.put('/records', (req: Request, res: Response) => {
  const records = req.body?.records;
  if (!Array.isArray(records) || records.length === 0 || records.length > MAX_RECORDS_PER_PUT) {
    return res.status(400).json({ success: false, error: `records must be an array of 1–${MAX_RECORDS_PER_PUT} items` });
  }
  if (!records.every((r) => r && typeof r === 'object' && typeof r.id === 'string' && ID_RE.test(r.id))) {
    return res.status(400).json({ success: false, error: 'every record needs an id of letters, digits, _ or -' });
  }

  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO pwa_records (id, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  try {
    db.exec('BEGIN');
    for (const r of records) upsert.run(r.id, JSON.stringify(r), now);
    db.exec('COMMIT');
    res.json({ success: true, saved: records.length, savedAt: now });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch {}
    console.error('[PWA Records Write Error]:', err);
    res.status(500).json({ success: false, error: 'Could not save records' });
  }
});
