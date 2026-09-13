import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { NextStepRecord, transformStepToCloudEvent, CloudEventPayload } from './cceTransformer.js';
import { publishEventToCce } from './ccePublisher.js';

let isRunning = false;
let workerTimer: NodeJS.Timeout | null = null;

/**
 * Enqueues a care step mutation into the transactional outbox.
 */
export function enqueueStepEvent(step: NextStepRecord, patientUpid?: string): string {
  const cloudEvent = transformStepToCloudEvent(step, patientUpid);
  const outboxId = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO cce_event_outbox (
      id, event_id, cloud_events_id, event_type, subject, facility_id,
      correlation_id, payload, status, attempts, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?)
  `);

  stmt.run(
    outboxId,
    cloudEvent.id,
    cloudEvent.id,
    cloudEvent.type,
    cloudEvent.subject,
    cloudEvent.facilityid,
    cloudEvent.correlationid,
    JSON.stringify(cloudEvent),
    now
  );

  console.log(`[Outbox] Enqueued event ${cloudEvent.id} for ${cloudEvent.subject} (${step.cat} -> ${step.level})`);
  return outboxId;
}

/**
 * Processes a batch of pending outbox events and dispatches them to CCE Gateway.
 */
export async function processOutboxBatch(): Promise<number> {
  const pendingStmt = db.prepare(`
    SELECT * FROM cce_event_outbox
    WHERE status = 'PENDING' OR (status = 'FAILED' AND attempts < ?)
    ORDER BY created_at ASC
    LIMIT ?
  `);

  const rows = pendingStmt.all(config.outbox.maxRetries, config.outbox.batchSize) as any[];
  if (!rows || rows.length === 0) return 0;

  let deliveredCount = 0;

  for (const row of rows) {
    let payload: CloudEventPayload;
    try {
      payload = JSON.parse(row.payload);
    } catch (err: any) {
      db.prepare(`UPDATE cce_event_outbox SET status = 'FAILED', last_error = ? WHERE id = ?`)
        .run(`Invalid JSON payload: ${err.message}`, row.id);
      continue;
    }

    const result = await publishEventToCce(payload);
    const now = new Date().toISOString();

    if (result.success && result.data) {
      db.prepare(`
        UPDATE cce_event_outbox
        SET status = 'DELIVERED',
            cloud_events_id = ?,
            cce_ack_event_id = ?,
            delivered_at = ?,
            attempts = attempts + 1,
            last_error = NULL
        WHERE id = ?
      `).run(result.data.cloudEventsId || payload.id, result.data.eventId, now, row.id);

      deliveredCount++;
      console.log(`[Outbox] Successfully delivered event ${payload.id} to CCE (Ack Event ID: ${result.data.eventId})`);
    } else {
      const errorMsg = result.error ? `${result.error.code}: ${result.error.message}` : 'Unknown error';
      const newAttempts = (row.attempts || 0) + 1;
      const newStatus = newAttempts >= config.outbox.maxRetries ? 'FAILED' : 'PENDING';

      db.prepare(`
        UPDATE cce_event_outbox
        SET status = ?,
            attempts = ?,
            last_error = ?
        WHERE id = ?
      `).run(newStatus, newAttempts, errorMsg, row.id);

      console.warn(`[Outbox] Delivery attempt ${newAttempts} failed for event ${payload.id}: ${errorMsg}`);
    }
  }

  return deliveredCount;
}

/**
 * Starts the periodic outbox background worker loop.
 */
export function startOutboxWorker(): void {
  if (isRunning) return;
  isRunning = true;
  console.log(`[Outbox Worker] Started polling every ${config.outbox.pollIntervalMs}ms`);

  const loop = async () => {
    try {
      await processOutboxBatch();
    } catch (err) {
      console.error('[Outbox Worker] Error in batch processing loop:', err);
    } finally {
      if (isRunning) {
        workerTimer = setTimeout(loop, config.outbox.pollIntervalMs);
      }
    }
  };

  loop();
}

/**
 * Stops the outbox background worker.
 */
export function stopOutboxWorker(): void {
  isRunning = false;
  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }
  console.log('[Outbox Worker] Stopped');
}

/**
 * Returns statistics of the outbox table.
 */
export function getOutboxStats() {
  const total = (db.prepare('SELECT COUNT(*) as count FROM cce_event_outbox').get() as any).count;
  const pending = (db.prepare("SELECT COUNT(*) as count FROM cce_event_outbox WHERE status = 'PENDING'").get() as any).count;
  const delivered = (db.prepare("SELECT COUNT(*) as count FROM cce_event_outbox WHERE status = 'DELIVERED'").get() as any).count;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM cce_event_outbox WHERE status = 'FAILED'").get() as any).count;

  return { total, pending, delivered, failed };
}

/**
 * Resets failed events back to PENDING for manual retry.
 */
export function retryFailedEvents(): number {
  const result = db.prepare(`
    UPDATE cce_event_outbox
    SET status = 'PENDING', attempts = 0, last_error = NULL
    WHERE status = 'FAILED'
  `).run();
  return Number(result.changes);
}
