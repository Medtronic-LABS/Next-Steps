import { randomUUID } from 'node:crypto';
import { getDb, Collections } from './firestore.js';
import { getUserById } from './UserService.js';
import { recordAuditEvent } from './AuditService.js';
import { createCCEEvent } from './CCEOutboxService.js';
import { resolveFacilityIdForVillage } from '../fixtures/villages.js';
import { DomainError, type Patient, type ProgrammeContext } from './types.js';

/**
 * Substring, case-insensitive search over name, phone number, and RCH/ABHA
 * id (addendum §2 — "Name (including partial/fuzzy), Phone number,
 * Programme ID"). The fixture set is tiny, so an in-memory filter over all
 * patients is simpler and more predictable than trying to emulate substring
 * search in Firestore.
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const snap = await getDb().collection(Collections.patients).get();
  return snap.docs
    .map((doc) => doc.data() as Patient)
    .filter(
      (patient) =>
        patient.displayName.toLowerCase().includes(trimmed) ||
        patient.phoneNumber.toLowerCase().includes(trimmed) ||
        (patient.rchId?.toLowerCase().includes(trimmed) ?? false),
    );
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const doc = await getDb().collection(Collections.patients).doc(patientId).get();
  return doc.exists ? (doc.data() as Patient) : null;
}

/** "Find a patient" lists everyone directly rather than requiring a typed search first. */
export async function listAllPatients(): Promise<Patient[]> {
  const snap = await getDb().collection(Collections.patients).get();
  return snap.docs.map((doc) => doc.data() as Patient);
}

export interface CreatePatientInput {
  actorUserId: string;
  displayName: string;
  phoneNumber: string;
  village: string;
  age?: number | null;
  rchId?: string | null;
  programmeId?: string | null;
  programmeAttributes?: Record<string, string>;
  whatsappReminderConsent: boolean;
}

/**
 * Lightweight registration (addendum §2). Callers are expected to have
 * already shown search results and confirmed "None of these" — this
 * function itself does not re-check for duplicates, so it never silently
 * merges records; the search-first UX lives in the workflow layer
 * (findPatientWorkflow.handleAddPatientCommand).
 */
export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const actor = await getUserById(input.actorUserId);
  if (!actor) throw new DomainError('Unknown user.', 'UNKNOWN_USER');

  const programmeContexts: ProgrammeContext[] = input.programmeId
    ? [{ programmeId: input.programmeId, attributes: input.programmeAttributes ?? {} }]
    : [];

  const db = getDb();
  const patientRef = db.collection(Collections.patients).doc(randomUUID());

  return db.runTransaction(async (tx) => {
    const now = new Date().toISOString();
    const patient: Patient = {
      id: patientRef.id,
      displayName: input.displayName,
      age: input.age ?? null,
      village: input.village,
      phoneNumber: input.phoneNumber,
      rchId: input.rchId ?? null,
      programmeContexts,
      whatsappReminderConsent: input.whatsappReminderConsent,
      consentTimestamp: now,
      consentCapturedByUserId: actor.id,
      synthetic: true,
      createdAt: now,
    };
    tx.set(patientRef, patient);

    recordAuditEvent(tx, {
      eventType: 'PATIENT_CREATED',
      patientId: patient.id,
      actorUserId: actor.id,
      actorRole: actor.role,
      facilityId: resolveFacilityIdForVillage(input.village),
    });

    createCCEEvent(tx, {
      eventType: 'PATIENT_CREATED',
      patientId: patient.id,
      displayName: patient.displayName,
      village: patient.village,
    });

    return patient;
  });
}
