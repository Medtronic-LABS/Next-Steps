import { randomUUID } from 'node:crypto';
import type { Transaction } from 'firebase-admin/firestore';
import { getDb, Collections } from './firestore.js';
import type { AuditEvent, AuditEventType, Provenance, Role } from './types.js';

export interface AuditEventInput {
  eventType: AuditEventType;
  // Absent for patient-/alert-level events (PATIENT_CREATED, ALERT_*) that
  // have no associated step.
  stepId?: string | null;
  patientId?: string | null;
  actorUserId: string;
  actorRole: Role;
  facilityId: string;
  provenance?: Provenance | null;
  downgraded?: boolean | null;
}

/**
 * Writes an audit event as part of the caller's transaction, so it commits
 * atomically with the domain state change it describes (spec §13).
 */
export function recordAuditEvent(tx: Transaction, input: AuditEventInput): AuditEvent {
  const event: AuditEvent = {
    id: randomUUID(),
    eventType: input.eventType,
    stepId: input.stepId ?? null,
    patientId: input.patientId ?? null,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    facilityId: input.facilityId,
    provenance: input.provenance ?? null,
    downgraded: input.downgraded ?? null,
    timestamp: new Date().toISOString(),
    channel: 'WHATSAPP',
  };
  tx.set(getDb().collection(Collections.auditEvents).doc(event.id), event);
  return event;
}
