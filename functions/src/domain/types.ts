// Domain types — coordination data only. Synthetic MVP (spec §1/§12).

export type Role = 'ANM' | 'STAFF_NURSE';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  role: Role;
  facilityId: string;
  phoneNumber: string; // E.164
  status: UserStatus;
}

export type FacilityTier = 'SUBCENTRE' | 'CHC';

export interface Facility {
  id: string;
  name: string;
  tier: FacilityTier;
}

/**
 * Condition-neutral programme membership (prototype addendum §2). A person
 * can belong to more than one programme; each context's `attributes` bag is
 * whatever that programme defines (e.g. RCH's `pregnancyStatus`) — the core
 * Patient/CareStep model never hard-codes a single programme's fields.
 */
export interface ProgrammeContext {
  programmeId: string; // e.g. 'RCH', 'HYPERTENSION' — see fixtures/programmes.ts
  attributes: Record<string, string>;
}

export interface Patient {
  id: string;
  displayName: string;
  age: number | null;
  village: string | null;
  /** Synthetic phone number, used only to drive the Call action (spec §2B). */
  phoneNumber: string;
  rchId: string | null; // ABHA/RCH id or equivalent programme id — optional
  programmeContexts: ProgrammeContext[];

  // WhatsApp reminder consent (addendum §3) — belongs to contact/consent
  // info, not to any one programme.
  whatsappReminderConsent: boolean;
  consentTimestamp: string | null;
  consentCapturedByUserId: string | null;

  synthetic: true;
  createdAt: string;
}

export type StepStatus = 'OPEN' | 'DONE';

/**
 * A step's kind is a category id from programme config (fixtures/stepCategories.ts),
 * not a fixed literal — condition-neutrality is an acceptance criterion
 * (addendum §17): the same mechanism must work for a REFERRAL, a LAB
 * follow-up, or an HTN_REVIEW without touching this type or ClosureService.
 */
export type StepKind = string;

/**
 * Closure provenance — spec §3's "four provenance answers". Exact wording is an
 * assumption pending review; see docs/whatsapp/workflow-matrix.md.
 */
export type Provenance =
  | 'AT_REFERRED_FACILITY'
  | 'OTHER_FACILITY'
  | 'PRIVATE_PROVIDER'
  | 'NOT_COMPLETED';

export type ContactOutcomeValue = 'SPOKE_TO_PATIENT' | 'NO_ANSWER' | 'WRONG_NUMBER';

export interface ContactOutcomeRecord {
  outcome: ContactOutcomeValue;
  byUserId: string;
  at: string; // ISO timestamp
}

export interface RescheduleRecord {
  fromDate: string; // ISO date
  toDate: string; // ISO date
  byUserId: string;
  at: string; // ISO timestamp
}

export interface CareStep {
  id: string;
  patientId: string;
  kind: StepKind;
  status: StepStatus;
  originFacilityId: string;
  destinationFacilityId: string;
  ownerUserId: string;
  facilityId: string; // denormalized = current owner's facility, for worklist queries
  dueDate: string; // ISO date

  // Arrival — independent of status (spec §2A). Never implies completion.
  arrivedAt: string | null;
  arrivedByUserId: string | null;
  arrivalFacilityId: string | null;

  // Closure — set only via ClosureService.closeStep()
  closedAt: string | null;
  closedByUserId: string | null;
  provenance: Provenance | null;
  downgraded: boolean | null;

  contactOutcomes: ContactOutcomeRecord[];
  rescheduleHistory: RescheduleRecord[];

  createdAt: string;
  updatedAt: string;
}

// Staging a referral is a conversation-side draft with no Firestore write (see
// ReferralService) and so has no audit event of its own — only confirming one
// changes authoritative state.
export type AuditEventType =
  | 'REFERRAL_CONFIRMED'
  | 'STEP_CLOSED'
  | 'STEP_RESCHEDULED'
  | 'CONTACT_OUTCOME_RECORDED'
  | 'ARRIVAL_RECORDED'
  | 'PATIENT_CREATED'
  | 'PATIENT_MATCH_CONFIRMED'
  | 'NEXT_STEP_CREATED'
  | 'ALERT_CREATED'
  | 'ALERT_RESOLVED';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  // null for patient- or alert-level events (PATIENT_CREATED, ALERT_*) that
  // have no associated step.
  stepId: string | null;
  patientId: string | null;
  actorUserId: string;
  actorRole: Role;
  facilityId: string;
  provenance: Provenance | null;
  downgraded: boolean | null;
  timestamp: string;
  channel: 'WHATSAPP';
}

export type CceOutboxStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface CceOutboxEvent {
  id: string; // deterministic: `${eventType}:${stepId}`
  status: CceOutboxStatus;
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Thrown by domain services for any authorization/validation failure. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'UNAUTHORIZED'
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'EXPIRED'
      | 'UNKNOWN_USER',
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
