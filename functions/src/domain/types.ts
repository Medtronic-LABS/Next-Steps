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

export interface Patient {
  id: string;
  displayName: string;
  /** Synthetic phone number, used only to drive the Call action (spec §2B). */
  phoneNumber: string;
  synthetic: true;
}

export type StepStatus = 'OPEN' | 'DONE';

export type StepKind = 'REFERRAL';

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
  | 'ARRIVAL_RECORDED';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  stepId: string;
  patientId: string;
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
