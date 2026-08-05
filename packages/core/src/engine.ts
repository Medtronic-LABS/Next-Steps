// The Care Coordination Engine (CCE) boundary. Both apps talk to this and
// nothing else; a real FHIR / Beckn-backed OpenPHC CCE can implement the same
// contract with no change to the app UIs (PRD §17).

import type {
  Category,
  Clinic,
  DrillKey,
  DueKey,
  Gender,
  Id,
  Insights,
  Patient,
  SummaryCard,
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

  // --- device sync state ---
  isOffline(): boolean;
  pending(): number;
  toggleOffline(): void;

  reset(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
