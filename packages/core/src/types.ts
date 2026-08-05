// Domain model for the OpenPHC Care Coordination Engine (CCE).
//
// Next Steps stores coordination data ONLY — no diagnoses, notes, prescriptions
// or billing. Shapes follow the PRD data dictionary (Patient / Visit / Next Step
// / Reminder), FHIR / Beckn-inspired.

export type Id = string;

/** A deployment's seed clinic identity (FR-A-5.2) — display only, no clinical meaning. */
export interface Clinic {
  name: string;
  admin: string;
  doctor: string;
}

/** The five next-step categories (PRD FR-A-5.1). */
export type Category =
  | 'FOLLOW_UP_VISIT'
  | 'LAB_INVESTIGATION'
  | 'SPECIALIST_REFERRAL'
  | 'FOLLOW_UP_CALL'
  | 'OTHER';

/** Stored lifecycle status (PRD §11). Overdue is derived, never stored. */
export type StepStatus = 'CREATED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';

export type Priority = 'NORMAL' | 'HIGH';

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

/** Due-date quick-pick keys (PRD FR-A-5.2). */
export type DueKey = '3d' | '1w' | '2w' | '1m' | '3m';

/** Worklist buckets (PRD FR-A-6.1), derived on read from dueDate/status/attempts (§11.3) — never stored. */
export type WorklistSection = 'overdue' | 'today' | 'soon' | 'unreach';

/** WhatsApp delivery status (PRD §10.4). '—' means no message applies. */
export type Delivery = 'Queued' | 'Sent' | 'Delivered' | 'Read' | 'Failed' | '—';

/**
 * A recorded consultation (PRD §10.2). Anchors Next Steps and timestamps the
 * consultation for metrics — carries no clinical fields (BR-017).
 */
export interface Visit {
  visitId: Id;
  patientId: Id;
  doctorId: Id;
  /** Defaults to now (BR-002). */
  visitDateTime: Date;
  /** True when the exception (backdating) flow was used (BR-003). */
  isBackdated: boolean;
  createdBy: Id;
  createdAt: Date;
}

/** An external identity reference (PRD §17), shaped as FHIR `Patient.identifier`. */
export interface Identifier {
  system: string;
  value: string;
}

/** Patient identity (PRD §10.1) — no clinical data. */
export interface Patient {
  id: Id;
  name: string;
  /** Stored E.164; displayed masked in lists (PRD FR-A-2.3). */
  mobile: string;
  gender: Gender;
  age: number;
  /** Clinic file / registration number. */
  cid: string;
  /** WhatsApp consent (PRD FR-A-3.3). */
  consent: boolean;
  /** Last visit label, e.g. "28 Jun". */
  last: string;
  /** Denormalized counts for search + summary. */
  open: number;
  overdue: number;
  /** Set when created via "Create anyway" against a mobile match (BR-008). */
  possibleDuplicate?: boolean;
  /** §17: at least a local identifier; a programme identifier (e.g. UPID/ABHA) is appended, never replacing it. */
  identifier: Identifier[];
  /** ITEM-8 NS-3: retained for PMSMA session grouping/filtering — not what an ANM's scope resolves against. */
  villageName?: string;
  /** ITEM-8 NS-3, NS-8: the linked ASHA — an ASHA's worklist scope, and the escalation routing key. */
  ashaName?: string;
  /** ITEM-8 NS-3: the sub-centre the registering ANM belongs to, set implicitly at registration. What an ANM_CHO's scope resolves against — not the village. */
  registeredAtFacilityId?: Id;
}

/** ITEM-8-HRP-NEWBORN.md NS-1: the four version-1 data-entry roles. PHC_MO is read-only and out of scope for this item. */
export type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

/**
 * NS-1, NS-13: a role's scope, supplied by the host (or the standalone
 * picker) — never decided by the product. ASHA/ANM_CHO scope by `scope` (an
 * ASHA link or sub-centre id, matched against Patient fields); PHC_SN/DH_SN
 * scope by `facilityId` (referrals expected there).
 */
export interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

/** NS-2: deployment configuration. Referral destinations resolve against this list only. */
export interface Facility {
  id: Id;
  name: string;
  tier: string;
  isReferralDestination: boolean;
}

/** NS-4: a referral back to a sub-centre is DOWNWARD; anything else raised is UPWARD. */
export type ReferralDirection = 'UPWARD' | 'DOWNWARD';

/** NS-4: a referral is a two-party commitment — an explicit destination and direction, distinct from an ordinary next step. */
export interface Referral {
  id: Id;
  patientId: Id;
  expectedAtFacilityId: Id;
  direction: ReferralDirection;
  /** Who raised it. The raising ASHA/ANM's own pending-referral view is scoped by this pair, not by the patient's registration facility (NS-1, NS-11). */
  raisedByRole: Role;
  raisedByScope?: string;
  raisedAt: Date;
}

/**
 * An immutable lifecycle transition record (PRD §11.4). Appended on every
 * status change; never edited or removed once written.
 */
export interface HistoryEntry {
  at: Date;
  byUser: Id;
  fromStatus: StepStatus | null;
  toStatus: StepStatus;
  reason?: string | null;
}

/**
 * A next step as it appears on the board / worklist (PRD §10.3).
 * `dueDate` is the one stored due value (§10.3); display labels and overdue
 * status are derived from it on read, never stored (§11.1, §11.3).
 */
export interface WorkStep {
  id: Id;
  pid: Id;
  /** Anchoring visit; exactly one per step (BR-006). */
  visitId: Id;
  name: string;
  cat: Category;
  detail: string;
  /** Stored UTC; rendered/derived in the clinic timezone (§10, default Asia/Kolkata). */
  dueDate: Date;
  priority: Priority;
  delivery: Delivery;
  attempts: number;
  status: StepStatus;
  /** Append-only transition log (§11.4). Absent until the first transition. */
  history?: HistoryEntry[];
  /** Set on completion; cleared on Reopen (§10.3, BR-007). */
  completedDate?: Date | null;
  completedBy?: Id | null;
  /** Cancellation reason — mandatory when status is CANCELLED (BR-013). */
  reason?: string | null;
  /** Decline reason — optional (§11.2). */
  declineReason?: string | null;
}

/** A next step being assembled during capture (PRD FR-A-5). */
export interface CaptureStep {
  id: Id;
  cat: Category;
  due: DueKey;
  priority: Priority;
  detail: string;
}

/** Visual + default metadata for a category. */
export interface CategoryMeta {
  label: string;
  detail: string;
  color: string;
  soft: string;
  due: DueKey;
  iconPath: string;
}

/** A doctor dashboard summary card (PRD FR-D-2.1). */
export interface SummaryCard {
  key: DrillKey;
  value: number;
  label: string;
  color: string;
  soft: string;
  iconPath: string;
}

export type DrillKey = Category | 'overdue' | 'unreach' | 'lost';

/** Care-completion insights (PRD FR-D-3), computed live for the period (BR-018). */
export interface Insights {
  completionRate: number;
  completionOf: string;
  prevRate: number;
  deltaPts: number;
  trend: number[];
  catBars: { label: string; pctLabel: string; width: string; color: string }[];
  backlogBars: { label: string; value: number; height: string; color: string }[];
  referral: { rate: number; ofLabel: string; medianDays: number };
  followThrough: { value: string; label: string; color: string; bg: string }[];
  followThroughNote: string;
}
