// Domain model for the OpenPHC Care Coordination Engine (CCE).
//
// Next Steps stores coordination data ONLY — no diagnoses, notes, prescriptions
// or billing. Shapes follow the PRD data dictionary (Patient / Visit / Next Step
// / Reminder), FHIR / Beckn-inspired.

export type Id = string;

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

/** Worklist buckets (PRD FR-A-6.1). 'future' is the seed label for 'upcoming'. */
export type WorklistSection = 'overdue' | 'today' | 'soon' | 'unreach' | 'future' | 'upcoming';

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
}

/**
 * A next step as it appears on the board / worklist (PRD §10.3).
 * `due` is a display label and `over` the whole days overdue — the prototype's
 * pre-computed coordination snapshot.
 */
export interface WorkStep {
  id: Id;
  pid: Id;
  /** Anchoring visit; exactly one per step (BR-006). */
  visitId: Id;
  name: string;
  cat: Category;
  detail: string;
  due: string;
  over: number;
  priority: Priority;
  delivery: Delivery;
  attempts: number;
  section: WorklistSection;
  status: StepStatus;
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

export type DrillKey = 'overdue' | 'invest' | 'referral' | 'unreach' | 'lost';

/** A doctor drill-down list (PRD FR-D-2.2). */
export interface Drill {
  title: string;
  sub: string;
  rows: Id[];
}

/** Care-completion insights (PRD FR-D-3), pre-aggregated for the period. */
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
