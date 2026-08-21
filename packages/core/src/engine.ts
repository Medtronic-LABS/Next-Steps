// The Care Coordination Engine (CCE) boundary. Both apps talk to this and
// nothing else; a real FHIR / Beckn-backed OpenPHC CCE can implement the same
// contract with no change to the app UIs (PRD §17).

import type {
  Category,
  Clinic,
  CompletionLocation,
  DrillKey,
  DueKey,
  Gender,
  Id,
  Identifier,
  Insights,
  Patient,
  PregnancyStatus,
  Referral,
  ReferralDirection,
  RegistrationField,
  RoleContext,
  SummaryCard,
  TrackingOutcome,
  Visit,
  WorkStep,
} from './types';
import type { CloudEvent, DecoratedStep, OverdueInfo } from './logic';
import type { InsightsStep } from './insights';
import type { ProgrammeProfile } from './profile';
import type { ProfileKey } from './profiles';

/** A step as read: the stored shape plus §11.1's overdue flags, derived fresh on every read. */
export type StepView = WorkStep & OverdueInfo;

export interface NewPatient {
  name: string;
  mobile: string;
  gender: Gender;
  age: number;
  cid: string;
  consent: boolean;
  /** ITEM-8 NS-3 registration additions. `registeredAtFacilityId` is set implicitly from the registering role's facility. */
  villageName?: string;
  ashaName?: string;
  registeredAtFacilityId?: Id;
  /** ITEM-8 NS-3 (batch 8e): newborn identity — the child's own RCH ID, linked to the mother's. */
  childRchId?: string;
  /** ITEM-8 NS-3 (batch 8e): the mother's RCH ID, carried on the newborn record. */
  motherRchId?: string;
  /** ITEM-8 NS-3 (batch 8e): event date anchoring follow-up scheduling — not a clinical measurement (BR-017). */
  deliveryDate?: Date;
  /** §17, item 5a: an ABHA/RCH identifier, appended alongside the local system identifier — never replacing it. */
  identifiers?: Identifier[];
  /** NS-12, NS-17: a single-select routing label, maternal profile only. */
  pregnancyStatus?: PregnancyStatus;
}

export interface CaptureInput {
  cat: Category;
  dueKey: DueKey;
  priority: 'NORMAL' | 'HIGH';
  /** Overrides the dueKey's default offset with an exact due date. Omit to derive from dueKey (FR-A-5.2). */
  dueDate?: Date;
}

/** Options for the visit anchoring a captured batch of Next Steps (§10.2). */
export interface VisitOptions {
  doctorId?: Id;
  createdBy?: Id;
  /** Omit to default to now; set to backdate (BR-003). */
  visitDateTime?: Date;
}

export interface RecordVisitResult {
  visitId: Id;
  stepIds: Id[];
  visit: Visit;
}

export interface WorklistSections {
  overdue: DecoratedStep[];
  today: DecoratedStep[];
  soon: DecoratedStep[];
  unreach: DecoratedStep[];
}

export interface DoneRow {
  name: string;
  detail: string;
}

export interface DrillRow {
  id: Id;
  pid: Id;
  patientName: string;
  detail: string;
  dueDate: string;
  color: string;
  soft: string;
  iconPath: string;
  badge: string;
  badgeColor: string;
  delivery: string;
}

export interface DrillView {
  title: string;
  sub: string;
  rows: DrillRow[];
}

/** A visit and its Next Steps, as shown in the patient timeline (FR-D-2.3, §11.4) — coordination data only (BR-017). */
export interface TimelineVisit {
  visitId: Id;
  visitDateTime: Date;
  steps: DecoratedStep[];
}

// --- roles, scope, referrals (ITEM-8-HRP-NEWBORN.md NS-1, NS-2, NS-4, NS-11 — batch 8a) ---

/** NS-11: the one worklist's eight named filters, applied after scope, never before (NS-1). */
export type WorklistFilter =
  | 'ALL_REGISTERED'
  | 'REFERRAL_PENDING'
  | 'ANC_DUE'
  | 'PMSMA_DUE'
  | 'TRACKING_NEEDED'
  | 'PRIVATE_CARE_DUE'
  | 'AT_RISK_OF_DROP_OUT'
  | 'LOST_TO_FOLLOW';

/** A worklist row is patient-centric; `referralId` is set on rows a referral-related filter surfaced. */
export interface WorklistRow extends Patient {
  referralId?: Id;
  /** NS-15: set on PRIVATE_CARE_DUE/TRACKING_NEEDED rows — when the underlying commitment is due. */
  dueDate?: Date;
}

/** NS-4: an open referral's arrival status — pending until the escalation-adjacent overdue threshold, derived on read, never stored. */
export type ArrivalStatus = 'PENDING' | 'OVERDUE';

/** NS-4: a row on a facility's arrival worklist — the referral itself, as seen by the expecting party. */
export interface ArrivalRow {
  id: Id;
  patientId: Id;
  expectedAtFacilityId: Id;
  direction: ReferralDirection;
  status: ArrivalStatus;
}

export interface RaiseReferralInput {
  expectedAtFacilityId: Id;
  direction: ReferralDirection;
}

/** NS-6: completionLocation is optional on close — a facility confirming arrival may not yet know it; defaults to REFERRED_PUBLIC_FACILITY (NS-5/NS-6 close together). */
export interface CloseReferralInput {
  completionLocation?: CompletionLocation;
}

/** NS-7: input to recordTrackingOutcome. `privateFollowUpDate` is only meaningful alongside COMPLETED_PRIVATE_FACILITY (NS-15). */
export interface RecordTrackingOutcomeInput {
  outcome: TrackingOutcome;
  privateFollowUpDate?: Date;
}

/** NS-5: closure attribution counted separately, never merged. */
export interface ReferralClosureSummary {
  facilityConfirmed: number;
  reported: number;
}

/** NS-6: referral resolution as a total with the public/private split available separately. */
export interface ReferralResolutionSummary {
  total: number;
  public: number;
  private: number;
}

/** NS-14: an unread count on the worklist entry point and on each filter with new or newly-escalated items — cleared per filter, per context, by markFilterOpened. */
export interface UnreadCounts {
  total: number;
  byFilter: Partial<Record<WorklistFilter, number>>;
}

/** ITEM-9-PHC-MO-DASHBOARD.md NS-18: six HRP-scoped figures, all derived on read (§11.1 precedent), never stored. */
export interface HrpDashboardViews {
  /** Every registered patient with a recorded pregnancy status — NS-18(i)'s denominator. */
  totalRegistered: number;
  /** NS-18(i)'s numerator: HRP-flagged patients only. */
  hrpCount: number;
  /** hrpCount ÷ totalRegistered, as a whole percentage. */
  hrpPercentage: number;
  /** NS-18(ii): HRPs with at least one PENDING referral. */
  referralsPending: number;
  /** NS-18(iii): HRPs with at least one overdue FOLLOW_UP_VISIT (ANC visit) step — reuses §11.1's deriveOverdue, the same flag getStep exposes. */
  ancOverdueCount: number;
  /** NS-18(iv): HRPs with at least one overdue PMSMA-labelled OTHER step. */
  pmsmaOverdueCount: number;
  /** NS-18(v): reuses NS-9's own AT_RISK_OF_DROP_OUT derivation (escalationCount >= 2) — not a reimplementation with its own threshold. */
  atRiskOfDropOutIds: Id[];
  /** NS-18(vi): HRPs whose latest tracking outcome is "does not want to go" ONLY — a distinct, narrower, dashboard-scoped figure. "Could not be contacted" stays part of NS-9's broader LOST_TO_FOLLOW/at-risk views, never counted here. */
  lostToFollowUpCount: number;
}

/** NS-19(i): resolved referrals against total raised, HRP-scoped, split by NS-6's CompletionLocation vocabulary. */
export interface HrpReferralClosureStatus {
  totalResolved: number;
  pending: number;
  referredPublicFacility: number;
  otherPublicFacility: number;
  privateFacility: number;
}

/** ITEM-9-PHC-MO-DASHBOARD.md NS-19: four HRP-scoped insights, all derived on read. */
export interface HrpDashboardInsights {
  referralClosure: HrpReferralClosureStatus;
  /** NS-19(ii): planned ANC visits completed ÷ planned ANC visits due — planned dates met, never a gestational-age/LMP-derived protocol window (BR-017/AP-7). */
  ancComplianceRate: number;
  /** Guards against the label silently reintroducing protocol-window framing (BR-017/AP-7): always "planned date met", never "protocol window met". */
  ancComplianceLabel: string;
  /** NS-19(iii): scheduled PMSMA sessions attended ÷ scheduled, HRP-scoped only. */
  pmsmaAttendanceRate: number;
  /** NS-19(iv): tracking outcomes resolving to any of NS-7's three "completed" leaves ÷ all recorded tracking outcomes, HRP-scoped. */
  trackingSuccessRate: number;
}

// Coordination event outbox (PRD §10.5, §17, ITEM-5-TEST-CASES.md 5d). Every
// accepted lifecycle transition writes exactly one CoordinationEvent; a
// transition rejected by §11.2 writes none. DECLINED has no eventType of its
// own — it and any other status change land under STATUS_CHANGED.
export type EventType = 'CREATED' | 'STATUS_CHANGED' | 'COMPLETED' | 'CANCELLED';

/** STUBBED is distinct from both PENDING (not yet attempted) and DISPATCHED (sent). */
export type DispatchStatus = 'PENDING' | 'DISPATCHED' | 'FAILED' | 'STUBBED';

export interface CoordinationEvent {
  eventId: Id;
  nextStepId: Id;
  eventType: EventType;
  payload: CloudEvent;
  dispatchStatus: DispatchStatus;
  /** When this event was written to the outbox. The CloudEvents envelope itself carries no `time` attribute (§17). */
  createdAt: Date;
}

/** Sends one already-built envelope to the CCE. Never called in stub mode (§17, §21.2). */
export interface Dispatcher {
  send(envelope: CloudEvent): Promise<void>;
}

export type DispatcherMode = 'stub' | 'live';

/**
 * §17: without a `dispatcher`, a transition still writes its event but has no
 * channel to send it through, so it is left PENDING (TC-OUT-003). With one,
 * `dispatcherMode` defaults to 'stub' — deploying a dispatcher does not, by
 * itself, opt into live sends.
 */
export interface EngineOptions {
  dispatcher?: Dispatcher;
  dispatcherMode?: DispatcherMode;
  /** FR-A-5.2, §10.5: the active programme profile. Absent fields fall back to catalog.ts's documented defaults. */
  profile?: ProgrammeProfile;
  /** FR-A-5.2: which seed clinic (and, absent an explicit `profile`, which programme profile) to load. Defaults to the diabetes deployment. */
  profileKey?: ProfileKey;
}

export interface CoordinationEngine {
  // --- programme profile (FR-A-5.1, FR-A-5.2) ---
  /** A category's label under the active programme profile (falls back to catalog.ts's documented default). */
  categoryLabel(cat: Category): string;
  /** A category's default due-date key under the active programme profile (falls back to catalog.ts's documented default). */
  categoryDefaultDue(cat: Category): DueKey;
  /** The active deployment's seed clinic identity (FR-A-5.2) — display only. */
  clinic(): Clinic;
  /** ITEM-8-HRP-NEWBORN.md NS-1, NS-13: whether this deployment declares the four version-1 roles — gates the standalone role picker and role-scoped UI. Deployment configuration, like categoryLabel/categoryDefaultDue. */
  rolesEnabled(): boolean;
  /** NS-17: which optional/conditional registration fields this deployment's profile collects — deployment configuration, like categoryLabel/rolesEnabled. */
  registrationFields(): RegistrationField[];

  // --- patients ---
  allPatients(): Promise<Patient[]>;
  searchPatients(query: string): Promise<Patient[]>;
  getPatient(id: Id): Promise<Patient | undefined>;
  createPatient(input: NewPatient): Promise<Patient>;

  // --- capture ---
  recordVisit(patientId: Id, steps: CaptureInput[], options?: VisitOptions): Promise<RecordVisitResult>;

  // --- worklist (admin) ---
  /** unreachableThreshold is clinic configuration (§10.5); defaults to DEFAULT_UNREACHABLE_THRESHOLD. */
  sections(filter: Category | 'all', unreachableThreshold?: number): Promise<WorklistSections>;
  doneRows(): Promise<DoneRow[]>;
  openTotal(filter: Category | 'all'): Promise<number>;
  openStepsForPatient(patientId: Id): Promise<DecoratedStep[]>;
  getStep(id: Id): Promise<StepView | undefined>;
  /** CREATED -> SCHEDULED (§11.2); the one legal transition into an open state. */
  scheduleStep(id: Id, byUser?: Id): Promise<void>;
  /** CREATED/SCHEDULED -> COMPLETED. completedDate must be >= the visit date and <= today (FR-A-7.1). */
  completeStep(id: Id, completedDate?: Date, completedBy?: Id): Promise<void>;
  /** CREATED/SCHEDULED -> CANCELLED. Reason is mandatory (BR-013). */
  cancelStep(id: Id, reason: string): Promise<void>;
  /** CREATED/SCHEDULED -> DECLINED. Reason is optional (§11.2). */
  declineStep(id: Id, reason?: string): Promise<void>;
  /** COMPLETED -> SCHEDULED, the sole exit from a terminal state, within 48 hours (FR-A-7.3, BR-007). */
  reopenStep(id: Id, byUser?: Id): Promise<void>;

  // --- doctor (read-only) ---
  summaryCards(): Promise<SummaryCard[]>;
  heroAttn(): Promise<number>;
  drill(key: DrillKey): Promise<DrillView>;
  insights(periodDays: number): Promise<Insights>;
  /** ITEM-7-AI-INSIGHTS.md AI-1, AI-4: coordination steps in the shape `answerQuestion` computes over — the app supplies the model client. */
  insightsSteps(): Promise<InsightsStep[]>;
  /** FR-D-2.3, §11.4: a patient's visits, most recent first, each with its steps and their history. */
  patientTimeline(patientId: Id): Promise<TimelineVisit[]>;

  // --- coordination event outbox (read-only, admin) ---
  /** §10.5: every CoordinationEvent written so far, oldest first. */
  outbox(): Promise<CoordinationEvent[]>;

  // --- roles, scope, referrals (ITEM-8-HRP-NEWBORN.md NS-1, NS-2, NS-4, NS-11 — batch 8a) ---
  /** NS-1, NS-11: scope is a precondition applied before any of the eight named filters — never a filter itself. New method; no existing call site needs updating. */
  worklist(context: RoleContext, filter: WorklistFilter): Promise<WorklistRow[]>;
  /** NS-4: raises a two-party referral. `expectedAtFacilityId` must resolve to a configured, referral-eligible facility (NS-2); free text and unconfigured ids are rejected. */
  raiseReferral(patientId: Id, input: RaiseReferralInput, context: RoleContext): Promise<Referral>;
  /** NS-4: the facility's arrival worklist — referrals expected there, until resolved. */
  arrivalWorklist(context: RoleContext): Promise<ArrivalRow[]>;
  /** A single referral, read back by id — e.g. to confirm a closed referral was not mutated into an onward one (NS-4). */
  getReferral(referralId: Id): Promise<Referral | undefined>;
  /**
   * NS-5, NS-6: resolves a referral. `closedByRole` is the closer's role;
   * attribution is FACILITY_CONFIRMED when the closer is the expecting
   * facility itself, REPORTED otherwise. Closing does not mutate the
   * referral into an onward one — an onward referral is always a fresh
   * `raiseReferral` call (NS-4).
   */
  closeReferral(referralId: Id, context: RoleContext, input?: CloseReferralInput): Promise<Referral>;
  /**
   * NS-7: records one of the six tracking-outcome leaves against a referral.
   * The three "completed" leaves resolve it, reusing NS-6's CompletionLocation
   * vocabulary. NS-8: PLAN_TO_GO_LATER resets the escalation clock without
   * touching escalationCount. NS-15: COMPLETED_PRIVATE_FACILITY with no
   * privateFollowUpDate raises a discovery commitment so the patient is never
   * absent from every worklist filter.
   */
  recordTrackingOutcome(referralId: Id, input: RecordTrackingOutcomeInput, context: RoleContext): Promise<Referral>;
  /** NS-5: FACILITY_CONFIRMED and REPORTED closures, counted separately — never merged. */
  referralClosureSummary(context: RoleContext): Promise<ReferralClosureSummary>;
  /** NS-6: referral resolution as a total with the public/private split available separately. */
  referralResolutionSummary(context: RoleContext): Promise<ReferralResolutionSummary>;
  /**
   * NS-3 decision ("ANC scheduling is manual — each next step is entered by
   * whoever decided it"): schedules an ANC visit due on `dueDate`. Populates
   * the ANC_DUE filter (NS-11).
   */
  scheduleAncVisit(patientId: Id, dueDate: Date, context: RoleContext): Promise<WorklistRow>;
  /**
   * NS-10: attaches a patient to her village's fixed-calendar PMSMA session
   * date — the 9th of the month — never an offset from the scheduling
   * action. Several women scheduled in the same window land on the same
   * date. Populates the PMSMA_DUE filter (NS-11).
   */
  schedulePmsma(patientId: Id, context: RoleContext): Promise<WorklistRow>;
  /** NS-14: unread counts for this context — the worklist entry point total, and each of the eight filters that has new or newly-escalated items since this context last opened it. */
  unreadCounts(context: RoleContext): Promise<UnreadCounts>;
  /** NS-14: clears the unread count for exactly this filter, for exactly this context — never any other filter, and never any other role/scope. */
  markFilterOpened(context: RoleContext, filter: WorklistFilter): Promise<void>;

  // --- PHC MO dashboard (ITEM-9-PHC-MO-DASHBOARD.md NS-18, NS-19 — Tier 1) ---
  /** NS-18: the six HRP-scoped dashboard figures, ~30,000 scope. */
  dashboardViews(): Promise<HrpDashboardViews>;
  /** NS-19: the four HRP-scoped dashboard insights. */
  dashboardInsights(): Promise<HrpDashboardInsights>;

  // --- device sync state ---
  isOffline(): boolean;
  pending(): number;
  toggleOffline(): void;

  reset(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
