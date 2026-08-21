// Fake CCE: in-memory store persisted to localStorage, with same-origin live
// sync (BroadcastChannel + storage events). Swap this class for a real
// FHIR / Beckn client without touching any screen.
//
// One source of truth: every open-step view (patient screen, worklist, search
// badges, doctor counts) derives from `allSteps()` = seed fixture + steps the
// administrator captures, minus any that reached a terminal state.

import { CATEGORY_ORDER, DUE, META } from './catalog';
import { isValidReferralDestination } from './facilities';
import { resolveAshaForVillage } from './villages';
import {
  getCategoryDefaultDue,
  getCategoryLabel,
  getEscalationWindowDays,
  getRegistrationFields,
  getRolesEnabled,
  type ProgrammeProfile,
} from './profile';
import { CARD_DEFS } from './seed';
import { getSeedClinic, resolveProfileKey, type ProfileKey, type SeedClinic } from './profiles';
import {
  buildCloudEvent,
  clinicDayIndex,
  completionRate,
  decorate,
  DEFAULT_UNREACHABLE_THRESHOLD,
  deriveOverdue,
  deriveSection,
  formatDueLabel,
  formatRateWithDenominator,
  inPeriod,
  LOCAL_IDENTIFIER_SYSTEM,
  lostToFollowUp,
  mapNextStepToFhirTask,
  medianDaysToCompletion,
  orderSection,
  overdueBuckets,
  patientsNeedingAttention,
  unreachablePatients,
  type DecoratedStep,
} from './logic';
import type {
  ArrivalRow,
  CaptureInput,
  CloseReferralInput,
  CoordinationEngine,
  CoordinationEvent,
  Dispatcher,
  DispatcherMode,
  DoneRow,
  DrillRow,
  DrillView,
  EngineOptions,
  EventType,
  HrpDashboardInsights,
  HrpDashboardViews,
  NewPatient,
  RaiseReferralInput,
  RecordTrackingOutcomeInput,
  RecordVisitResult,
  ReferralClosureSummary,
  ReferralResolutionSummary,
  StepView,
  TimelineVisit,
  UnreadCounts,
  VisitOptions,
  WorklistFilter,
  WorklistRow,
  WorklistSections,
} from './engine';
import type { InsightsStep } from './insights';
import type {
  Category,
  Clinic,
  CompletionLocation,
  DrillKey,
  DueKey,
  HistoryEntry,
  Id,
  Identifier,
  Insights,
  Patient,
  Referral,
  RegistrationField,
  Role,
  RoleContext,
  StepStatus,
  SummaryCard,
  TrackingOutcome,
  Visit,
  WorklistSection,
  WorkStep,
} from './types';

/** BR-003: backdating is limited to the past 30 days; future dates are rejected. */
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BACKDATE_DAYS = 30;

/** Returns isBackdated, or throws when visitDateTime is out of the BR-003 window. */
function resolveIsBackdated(visitDateTime: Date, now: Date): boolean {
  const diffMs = now.getTime() - visitDateTime.getTime();
  if (diffMs < 0) {
    throw new Error('Visit date/time cannot be in the future (BR-003).');
  }
  const daysBack = Math.floor(diffMs / DAY_MS);
  if (daysBack >= MAX_BACKDATE_DAYS) {
    throw new Error('Backdating is limited to the past 30 days (BR-003).');
  }
  return daysBack > 0;
}

/** NS-10: PMSMA is a fixed-calendar village outreach session on the 9th of the month, never an offset from the scheduling action. */
const PMSMA_DAY_OF_MONTH = 9;

/** NS-10: the next occurring 9th on or after `now`'s calendar day — every woman scheduled before that date shares it. */
function nextPmsmaSessionDate(now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const sessionMonth = now.getUTCDate() <= PMSMA_DAY_OF_MONTH ? month : month + 1;
  return new Date(Date.UTC(year, sessionMonth, PMSMA_DAY_OF_MONTH));
}

/** §11.2: only these three statuses are terminal — CREATED/SCHEDULED are open. */
const TERMINAL_STATUSES: ReadonlySet<StepStatus> = new Set(['COMPLETED', 'CANCELLED', 'DECLINED']);

/** Fallback actor for transitions the caller doesn't attribute to a user (§11.4 requires byUser to be set). */
const SYSTEM_ACTOR = 'system';

/** FR-D-2.2: static title/sub copy per drill-down key actually used by CARD_DEFS — the row set itself is derived live (BR-018). */
const DRILL_META: Partial<Record<DrillKey, { title: string; sub: string }>> = {
  overdue: { title: 'Overdue next steps', sub: 'Steps past their due date' },
  LAB_INVESTIGATION: { title: 'Investigations pending', sub: 'Lab investigations not yet done' },
  SPECIALIST_REFERRAL: { title: 'Referrals pending', sub: 'Referrals not yet completed' },
  unreach: { title: 'Unreachable patients', sub: 'Could not reach after 3+ attempts' },
  lost: { title: 'Lost to follow-up', sub: 'Long overdue and unreachable' },
};

/** FR-D-2.2, BR-018: which live, open steps qualify for each drill-down key — a category key or a coordination state. */
function matchesDrillKey(key: DrillKey, step: WorkStep, threshold: number, now: Date): boolean {
  const { isOverdue } = deriveOverdue(step.dueDate, step.status, now);
  switch (key) {
    case 'overdue':
      return isOverdue;
    case 'unreach':
      return step.attempts >= threshold;
    case 'lost':
      return isOverdue && step.attempts >= threshold;
    default:
      return step.cat === key;
  }
}

/** §13 overdue-backlog bar presentation: proportional bar height per bucket, aged-severity colour ramp. */
const BACKLOG_BUCKET_LABELS = ['1–7 d', '8–30 d', '31–90 d', '90+ d'];
const BACKLOG_BUCKET_COLORS = ['#EB956A', '#C35721', '#994242', '#751A1A'];
function backlogBars(values: number[]): { label: string; value: number; height: string; color: string }[] {
  const max = Math.max(1, ...values);
  return values.map((v, i) => ({
    label: BACKLOG_BUCKET_LABELS[i],
    value: v,
    height: v === 0 ? '6%' : `${Math.round(Math.max(0.2, v / max) * 88)}%`,
    color: BACKLOG_BUCKET_COLORS[i],
  }));
}

/** §13 per-category completion bars exclude OTHER, matching the doctor dashboard's four-category layout. */
const INSIGHTS_CATEGORIES = CATEGORY_ORDER.filter((c) => c !== 'OTHER');

/** §13, PROVISIONAL: default lost-to-follow-up window, pending §21 clinician review. */
const LOST_TO_FOLLOW_UP_DAYS = 30;

/** FR-A-7.3/BR-007: the sole reopen window, inclusive at both ends (PROVISIONAL — see ITEM-2-TEST-CASES.md). */
const REOPEN_WINDOW_MS = 48 * 60 * 60 * 1000;

function assertNotTerminal(step: WorkStep, action: string): void {
  if (TERMINAL_STATUSES.has(step.status)) {
    throw new Error(`Cannot ${action} step ${step.id}: it is already ${step.status}, a terminal status (§11.2).`);
  }
}

/** Defensive copy — history entries must never be a live reference into the store (§11.4). */
function cloneStep(step: WorkStep): WorkStep {
  return { ...step, history: step.history ? step.history.map((h) => ({ ...h })) : step.history };
}

/** Namespaced per profile (below) so switching profiles never mixes one deployment's captured data into another's. */
const STORAGE_KEY_PREFIX = 'next-steps-cce-v3';

/** Simulated CCE network latency (PRD §17 stub mode). */
const SIMULATED_LATENCY_MS = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** NS-15: an ordinary follow-up commitment created when private closure supplies a follow-up date. */
interface PrivateCareCommitment {
  id: Id;
  patientId: Id;
  referralId: Id;
  dueDate: Date;
  createdAt: Date;
}

/** NS-15: a discovery commitment — owned by ANM_CHO, resolvable by ASHA — created when private closure supplies no follow-up date, so the patient is never absent from every filter. */
interface DiscoveryCommitment {
  id: Id;
  patientId: Id;
  referralId: Id;
  dueDate: Date;
  createdAt: Date;
}

/** NS-3 decision ("ANC scheduling is manual"): a scheduled ANC visit, entered by whoever decided it — populates the ANC_DUE filter (NS-11). */
interface AncVisitCommitment {
  id: Id;
  patientId: Id;
  dueDate: Date;
  createdAt: Date;
}

/** NS-10: a scheduled PMSMA attendance, attached to the village's next fixed-calendar session date (the 9th of the month) — never an offset from the scheduling action. */
interface PmsmaCommitment {
  id: Id;
  patientId: Id;
  villageName?: string;
  sessionDate: Date;
  createdAt: Date;
}

/** NS-8: an escalation notification, derived from escalationCount rather than logged — there is no notification channel yet (NS-14's in-app badge is the nearest existing one). */
interface EscalationAlert {
  referralId: Id;
  recipientRole: Role;
  ashaName?: string;
}

interface Persisted {
  createdPatients: Patient[];
  createdSteps: WorkStep[];
  createdVisits: Visit[];
  offline: boolean;
  pending: number;
  /** §10.5 CCE outbox — one CoordinationEvent per accepted lifecycle transition. */
  outbox: CoordinationEvent[];
  /** ITEM-8 NS-4 — two-party referrals, raised via raiseReferral. */
  referrals: Referral[];
  /** NS-8: per-referral escalation-clock anchor — the point from which the next escalation window is measured. Reset by "plan to go later"; escalationCount itself lives on the referral and is never reset. */
  escalationClocks: Record<Id, Date>;
  /** NS-15. */
  privateCareCommitments: PrivateCareCommitment[];
  discoveryCommitments: DiscoveryCommitment[];
  /** NS-11 batch 8d. */
  ancVisitCommitments: AncVisitCommitment[];
  pmsmaCommitments: PmsmaCommitment[];
  /**
   * NS-14: per-context, per-filter "last opened" timestamp — the badge
   * clears for exactly that (context, filter) pair, never any other.
   * Keyed by contextKey().
   */
  filterOpenedAt: Record<string, Partial<Record<WorklistFilter, Date>>>;
  /** NS-14: when a referral's escalationCount last changed — what makes AT_RISK_OF_DROP_OUT's badge "newly-escalated" rather than merely "still escalated". */
  escalationBadgeAt: Record<Id, Date>;
  /** NS-14: when a referral's lastTrackingOutcome was last recorded — what makes LOST_TO_FOLLOW's badge "new". */
  trackingOutcomeBadgeAt: Record<Id, Date>;
}

function emptyState(): Persisted {
  return {
    createdPatients: [],
    createdSteps: [],
    createdVisits: [],
    offline: false,
    pending: 0,
    outbox: [],
    referrals: [],
    escalationClocks: {},
    privateCareCommitments: [],
    discoveryCommitments: [],
    ancVisitCommitments: [],
    pmsmaCommitments: [],
    filterOpenedAt: {},
    escalationBadgeAt: {},
    trackingOutcomeBadgeAt: {},
  };
}

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export class InMemoryCoordinationEngine implements CoordinationEngine {
  private state: Persisted;
  private listeners = new Set<() => void>();
  private channel?: BroadcastChannel;
  private dispatcher?: Dispatcher;
  private dispatcherMode: DispatcherMode;
  private profile?: ProgrammeProfile;
  private seedClinic: SeedClinic;
  private storageKey: string;

  constructor(options?: EngineOptions) {
    this.dispatcher = options?.dispatcher;
    this.dispatcherMode = options?.dispatcherMode ?? 'stub';
    const profileKey: ProfileKey = options?.profileKey ?? resolveProfileKey();
    this.seedClinic = getSeedClinic(profileKey);
    this.profile = options?.profile ?? this.seedClinic.profile;
    this.storageKey = `${STORAGE_KEY_PREFIX}:${profileKey}`;
    this.state = this.load();
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(this.storageKey);
        this.channel.onmessage = () => {
          this.state = this.load();
          this.emit();
        };
      }
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey) {
          this.state = this.load();
          this.emit();
        }
      });
    }
  }

  private load(): Persisted {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Persisted;
          // Dates don't survive JSON round-tripping through localStorage.
          if (parsed.createdVisits) {
            parsed.createdVisits = parsed.createdVisits.map((v) => ({
              ...v,
              visitDateTime: new Date(v.visitDateTime),
              createdAt: new Date(v.createdAt),
            }));
          }
          if (parsed.createdSteps) {
            parsed.createdSteps = parsed.createdSteps.map((w) => ({
              ...w,
              completedDate: w.completedDate ? new Date(w.completedDate) : w.completedDate,
              history: w.history?.map((h) => ({ ...h, at: new Date(h.at) })),
            }));
          }
          if (parsed.outbox) {
            parsed.outbox = parsed.outbox.map((e) => ({ ...e, createdAt: new Date(e.createdAt) }));
          }
          if (parsed.referrals) {
            parsed.referrals = parsed.referrals.map((r) => ({
              ...r,
              raisedAt: new Date(r.raisedAt),
              closedAt: r.closedAt ? new Date(r.closedAt) : r.closedAt,
              escalationCount: r.escalationCount ?? 0,
            }));
          }
          if (parsed.escalationClocks) {
            parsed.escalationClocks = Object.fromEntries(
              Object.entries(parsed.escalationClocks).map(([id, at]) => [id, new Date(at)]),
            );
          }
          if (parsed.privateCareCommitments) {
            parsed.privateCareCommitments = parsed.privateCareCommitments.map((c) => ({
              ...c,
              dueDate: new Date(c.dueDate),
              createdAt: new Date(c.createdAt),
            }));
          }
          if (parsed.discoveryCommitments) {
            parsed.discoveryCommitments = parsed.discoveryCommitments.map((c) => ({
              ...c,
              dueDate: new Date(c.dueDate),
              createdAt: new Date(c.createdAt),
            }));
          }
          if (parsed.ancVisitCommitments) {
            parsed.ancVisitCommitments = parsed.ancVisitCommitments.map((c) => ({
              ...c,
              dueDate: new Date(c.dueDate),
              createdAt: new Date(c.createdAt),
            }));
          }
          if (parsed.pmsmaCommitments) {
            parsed.pmsmaCommitments = parsed.pmsmaCommitments.map((c) => ({
              ...c,
              sessionDate: new Date(c.sessionDate),
              createdAt: new Date(c.createdAt),
            }));
          }
          if (parsed.filterOpenedAt) {
            parsed.filterOpenedAt = Object.fromEntries(
              Object.entries(parsed.filterOpenedAt).map(([key, byFilter]) => [
                key,
                Object.fromEntries(Object.entries(byFilter).map(([filter, at]) => [filter, new Date(at as unknown as string)])),
              ]),
            );
          }
          if (parsed.escalationBadgeAt) {
            parsed.escalationBadgeAt = Object.fromEntries(
              Object.entries(parsed.escalationBadgeAt).map(([id, at]) => [id, new Date(at)]),
            );
          }
          if (parsed.trackingOutcomeBadgeAt) {
            parsed.trackingOutcomeBadgeAt = Object.fromEntries(
              Object.entries(parsed.trackingOutcomeBadgeAt).map(([id, at]) => [id, new Date(at)]),
            );
          }
          return { ...emptyState(), ...parsed };
        } catch {
          /* reseed */
        }
      }
    }
    return emptyState();
  }

  private commit(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }
    if (this.channel) this.channel.postMessage('update');
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- programme profile (FR-A-5.1, FR-A-5.2) -----------------------------

  categoryLabel(cat: Category): string {
    return getCategoryLabel(cat, this.profile);
  }

  categoryDefaultDue(cat: Category): DueKey {
    return getCategoryDefaultDue(cat, this.profile);
  }

  clinic(): Clinic {
    return this.seedClinic.clinic;
  }

  rolesEnabled(): boolean {
    return getRolesEnabled(this.profile);
  }

  registrationFields(): RegistrationField[] {
    return getRegistrationFields(this.profile);
  }

  private bump(): void {
    if (this.state.offline) this.state.pending += 1;
  }

  private isClosed(id: Id): boolean {
    const step = this.allSteps().find((w) => w.id === id);
    return !!step && TERMINAL_STATUSES.has(step.status);
  }

  // --- steps (single source of truth) -------------------------------------

  private allSteps(): WorkStep[] {
    const overridden = new Set(this.state.createdSteps.map((w) => w.id));
    return [...this.state.createdSteps, ...this.seedClinic.work.filter((w) => !overridden.has(w.id))];
  }

  private openSteps(): WorkStep[] {
    return this.allSteps().filter((w) => !this.isClosed(w.id));
  }

  /**
   * The one mutable record for a step. SEED steps live in the shared, immutable
   * `WORK` fixture, so the first transition against one clones it into
   * `state.createdSteps` (per-instance) and every later transition mutates
   * that clone in place — this is what lets `allSteps()` prefer it over WORK.
   */
  private materialize(id: Id): WorkStep | undefined {
    const existing = this.state.createdSteps.find((w) => w.id === id);
    if (existing) return existing;
    const seed = this.seedClinic.work.find((w) => w.id === id);
    if (!seed) return undefined;
    const clone: WorkStep = { ...seed, history: seed.history ? seed.history.map((h) => ({ ...h })) : [] };
    this.state.createdSteps = [clone, ...this.state.createdSteps];
    return clone;
  }

  /** §17: an outbox event needs a patient to resolve the UPID; an unresolved pid degrades to its own value (mirrors recordVisit's patient lookup) rather than blocking the transition. */
  private patientRefFor(pid: Id): Patient {
    return this.getPatientSync(pid) ?? ({ id: pid, identifier: [] } as unknown as Patient);
  }

  /**
   * §10.5, §17: writes exactly one CoordinationEvent for an accepted
   * transition, starting PENDING. Building the envelope must never propagate
   * into the caller either, so a step this can't map (e.g. one missing a
   * dueDate) simply leaves no event behind rather than failing the
   * transition. A CREATED event (capture) is queued for later dispatch rather
   * than sent immediately — a multi-step visit shouldn't fan out N
   * synchronous dispatch attempts of its own (TC-OUT-003, TC-OUT-006); every
   * other, individually user-triggered transition attempts dispatch right
   * away, but never lets a rejection escape (§17: CCE unavailability must
   * never block clinic operations).
   */
  private async writeEvent(step: WorkStep, eventType: EventType): Promise<void> {
    let event: CoordinationEvent;
    try {
      const task = mapNextStepToFhirTask(step, this.patientRefFor(step.pid));
      event = {
        eventId: uid('evt'),
        nextStepId: step.id,
        eventType,
        payload: buildCloudEvent(task),
        dispatchStatus: 'PENDING',
        createdAt: new Date(),
      };
    } catch {
      return;
    }
    this.state.outbox = [...this.state.outbox, event];
    if (eventType !== 'CREATED') {
      await this.attemptDispatch(event);
    }
  }

  /**
   * §17, §21.2: with no dispatcher configured there is no channel to send
   * through, so the event is left PENDING. Stub mode marks STUBBED without
   * ever calling the dispatcher. Live mode attempts a send and swallows a
   * rejection into FAILED, leaving the event retryable.
   */
  private async attemptDispatch(event: CoordinationEvent): Promise<void> {
    if (!this.dispatcher) return;
    if (this.dispatcherMode === 'stub') {
      event.dispatchStatus = 'STUBBED';
      return;
    }
    try {
      await this.dispatcher.send(event.payload);
      event.dispatchStatus = 'DISPATCHED';
    } catch {
      event.dispatchStatus = 'FAILED';
    }
  }

  /** The outbox, defensively copied so callers can't mutate engine state. */
  getOutbox(): CoordinationEvent[] {
    return this.state.outbox.map((e) => ({ ...e, payload: { ...e.payload } }));
  }

  /** §10.5, CoordinationEngine's read-only outbox view: apps reach the outbox only through this. */
  async outbox(): Promise<CoordinationEvent[]> {
    return this.getOutbox();
  }

  /** §17, verified collector contract: reuses the failed event's own envelope — same id, same source — never mints a fresh one. */
  async retryDispatch(eventId: Id): Promise<void> {
    const event = this.state.outbox.find((e) => e.eventId === eventId);
    if (!event) return;
    await this.attemptDispatch(event);
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  /** §11.4: append one immutable entry per transition; never mutate an existing one. */
  private appendHistory(
    step: WorkStep,
    toStatus: StepStatus,
    byUser: Id,
    reason: string | null = null,
    at: Date = new Date(),
  ): void {
    const entry: HistoryEntry = { at, byUser, fromStatus: step.status, toStatus, reason };
    step.history = [...(step.history ?? []), entry];
  }

  // --- visits (single source of truth; BR-006 anchors every step to one) --

  private allVisits(): Visit[] {
    return [...this.state.createdVisits, ...this.seedClinic.visits];
  }

  private async visitCount(): Promise<number> {
    const result = this.allVisits().length;
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** §13 median-days-to-completion is measured from visitDate (BR-006: exactly one visit per step). */
  private stepsWithVisitDate(): (WorkStep & { visitDate: Date })[] {
    const visitDates = new Map(this.allVisits().map((v) => [v.visitId, v.visitDateTime]));
    return this.allSteps().map((w) => ({ ...w, visitDate: visitDates.get(w.visitId) ?? w.dueDate }));
  }

  /** §13 lost-to-follow-up: every step (open or closed) per patient, plus that patient's most recent visit. */
  private patientsForLostToFollowUp(): {
    patientId: Id;
    steps: { dueDate: Date; status: StepStatus; attempts: number }[];
    lastVisitDate: Date;
  }[] {
    const lastVisitByPatient = new Map<Id, Date>();
    for (const v of this.allVisits()) {
      const current = lastVisitByPatient.get(v.patientId);
      if (!current || v.visitDateTime > current) lastVisitByPatient.set(v.patientId, v.visitDateTime);
    }
    const stepsByPatient = new Map<Id, { dueDate: Date; status: StepStatus; attempts: number }[]>();
    for (const w of this.allSteps()) {
      const entry = { dueDate: w.dueDate, status: w.status, attempts: w.attempts };
      const list = stepsByPatient.get(w.pid);
      if (list) list.push(entry);
      else stepsByPatient.set(w.pid, [entry]);
    }
    return [...stepsByPatient.entries()].map(([patientId, steps]) => ({
      patientId,
      steps,
      lastVisitDate: lastVisitByPatient.get(patientId) ?? new Date(0),
    }));
  }

  async getStep(id: Id): Promise<StepView | undefined> {
    const result = this.allSteps().find((w) => w.id === id);
    await delay(SIMULATED_LATENCY_MS);
    if (!result) return undefined;
    return { ...cloneStep(result), ...deriveOverdue(result.dueDate, result.status) };
  }

  private countsFor(pid: Id): { open: number; overdue: number } {
    const open = this.openSteps().filter((w) => w.pid === pid);
    return {
      open: open.length,
      overdue: open.filter((w) => deriveOverdue(w.dueDate, w.status).isOverdue).length,
    };
  }

  private withCounts(p: Patient): Patient {
    return { ...p, ...this.countsFor(p.id) };
  }

  // --- patients -----------------------------------------------------------

  private allPatientsSync(): Patient[] {
    return [...this.state.createdPatients, ...this.seedClinic.patients].map((p) => this.withCounts(p));
  }

  private getPatientSync(id: Id): Patient | undefined {
    const p = [...this.state.createdPatients, ...this.seedClinic.patients].find((x) => x.id === id);
    return p ? this.withCounts(p) : undefined;
  }

  async allPatients(): Promise<Patient[]> {
    const result = this.allPatientsSync();
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  private matchesQuery(p: Patient, q: string): boolean {
    const digits = q.replace(/\D/g, '');
    if (/\d/.test(q)) return digits.length >= 4 && p.mobile.replace(/\D/g, '').startsWith(digits);
    return p.name.toLowerCase().split(' ').some((t) => t.startsWith(q)) || p.name.toLowerCase().startsWith(q);
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim().toLowerCase();
    const all = this.allPatientsSync();
    const result = !q
      ? all.slice(0, 6)
      : all.filter((p) => {
          if (this.matchesQuery(p, q)) return true;
          // NS-3 (batch 8e): a newborn may be found by searching the mother —
          // resolve the link via `motherRchId` rather than the newborn's own name.
          if (p.motherRchId) {
            const mother = all.find((m) => m.identifier.some((i) => i.value === p.motherRchId));
            if (mother && this.matchesQuery(mother, q)) return true;
          }
          return false;
        });
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async getPatient(id: Id): Promise<Patient | undefined> {
    const result = this.getPatientSync(id);
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async createPatient(input: NewPatient): Promise<Patient> {
    const id = crypto.randomUUID();
    const identifier: Identifier[] = [{ system: LOCAL_IDENTIFIER_SYSTEM, value: id }, ...(input.identifiers ?? [])];
    const patient: Patient = {
      id,
      name: input.name,
      mobile: input.mobile,
      gender: input.gender,
      age: input.age,
      cid: input.cid,
      consent: input.consent,
      last: 'Today',
      open: 0,
      overdue: 0,
      identifier,
      villageName: input.villageName,
      // NS-17: a configured village's linked ASHA always wins over a typed
      // value; falls back to input.ashaName when villageName resolves to no
      // configured village (e.g. a deployment with no village list).
      ashaName: resolveAshaForVillage(input.villageName) ?? input.ashaName,
      registeredAtFacilityId: input.registeredAtFacilityId,
      childRchId: input.childRchId,
      motherRchId: input.motherRchId,
      deliveryDate: input.deliveryDate,
      pregnancyStatus: input.pregnancyStatus,
    };
    this.state.createdPatients = [patient, ...this.state.createdPatients];
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return patient;
  }

  // --- roles, scope, referrals (ITEM-8-HRP-NEWBORN.md NS-1, NS-2, NS-4, NS-11 — batch 8a) --

  /**
   * NS-1: scope is a precondition, resolved before any of the eight named
   * filters — so no filter can widen a result beyond it. ASHA/ANM_CHO scope
   * by a Patient field; PHC_SN/DH_SN have no patient roster of their own —
   * theirs is every patient with a referral expected at their facility.
   */
  private patientsInScope(context: RoleContext): Patient[] {
    const patients = this.allPatientsSync();
    switch (context.role) {
      case 'ASHA':
        return patients.filter((p) => p.ashaName === context.scope);
      case 'ANM_CHO':
        return patients.filter((p) => p.registeredAtFacilityId === context.scope);
      case 'PHC_SN':
      case 'DH_SN': {
        const patientIds = new Set(
          this.state.referrals.filter((r) => r.expectedAtFacilityId === context.facilityId).map((r) => r.patientId),
        );
        return patients.filter((p) => patientIds.has(p.id));
      }
      default:
        return [];
    }
  }

  /**
   * NS-11 REFERRAL_PENDING: for the raising ASHA/ANM, scoped by who raised
   * it, not by the patient's own registration facility — a referral she
   * raises is hers to track regardless of where the patient is registered.
   * For the expecting facility, this is the same set arrivalWorklist reads.
   */
  private referralInScope(r: Referral, context: RoleContext): boolean {
    switch (context.role) {
      case 'ASHA':
      case 'ANM_CHO':
        return r.raisedByRole === context.role && r.raisedByScope === context.scope;
      case 'PHC_SN':
      case 'DH_SN':
        return r.expectedAtFacilityId === context.facilityId;
      default:
        return false;
    }
  }

  private referralPendingRows(context: RoleContext): WorklistRow[] {
    return this.state.referrals
      .filter((r) => r.status === 'PENDING' && this.referralInScope(r, context))
      .map((r) => {
        const patient = this.getPatientSync(r.patientId);
        return patient ? { ...patient, referralId: r.id } : ({ id: r.patientId, referralId: r.id } as WorklistRow);
      });
  }

  /**
   * NS-8: catches up one referral's escalationCount to `now`, from whichever
   * point its clock last ran from — raisedAt, or the last "plan to go later"
   * reset. Only ever applied to a PENDING referral; a resolved one has
   * nothing left to escalate. Escalation never routes higher on repeat —
   * every elapsed window just increments the same stored count, and it is
   * the count's value (>= 2), not a distinct escalation "level", that later
   * makes AT_RISK_OF_DROP_OUT true (NS-9).
   */
  private materializeEscalation(referral: Referral, now: Date): void {
    if (referral.status !== 'PENDING') return;
    const windowDays = getEscalationWindowDays(this.profile);
    const anchor = this.state.escalationClocks[referral.id] ?? referral.raisedAt;
    // Whole-day granularity, like arrivalStatus's clinicDayIndex use (§11.1's
    // precedent) — a millisecond comparison would be fragile to the few ms
    // of drift vitest's fake timers introduce across awaits when
    // {shouldAdvanceTime: true} is set (house convention, tc-ref-002.test.ts).
    const anchorDayIndex = clinicDayIndex(anchor);
    const elapsedDays = clinicDayIndex(now) - anchorDayIndex;
    const elapsedWindows = Math.floor(elapsedDays / windowDays);
    if (elapsedWindows <= 0) return;
    referral.escalationCount += elapsedWindows;
    this.state.escalationClocks[referral.id] = new Date((anchorDayIndex + elapsedWindows * windowDays) * DAY_MS);
    // NS-14: marks this escalation as "new" for the AT_RISK_OF_DROP_OUT badge, cleared independently per (context, filter) by markFilterOpened.
    this.state.escalationBadgeAt[referral.id] = now;
  }

  /** Applied before every read or write that depends on escalation state, so escalationCount is always caught up to `now` — the "stored integer" NS-8 describes, materialized lazily rather than by a background job. */
  private syncEscalation(now: Date): void {
    let changed = false;
    for (const r of this.state.referrals) {
      const before = r.escalationCount;
      this.materializeEscalation(r, now);
      if (r.escalationCount !== before) changed = true;
    }
    if (changed) this.commit();
  }

  /** NS-9: an open referral with escalationCount >= 2, for a patient in `context`'s scope — derived on read, never stored. */
  private isAtRiskOfDropOut(patientId: Id): boolean {
    return this.state.referrals.some(
      (r) => r.patientId === patientId && r.status === 'PENDING' && r.escalationCount >= 2,
    );
  }

  /** NS-9: an open referral whose latest tracking outcome is "does not want to go" or "could not be contacted" — derived on read, never stored. */
  private isLostToFollow(patientId: Id): boolean {
    return this.state.referrals.some(
      (r) =>
        r.patientId === patientId &&
        r.status === 'PENDING' &&
        (r.lastTrackingOutcome === 'DOES_NOT_WANT_TO_GO' || r.lastTrackingOutcome === 'COULD_NOT_BE_CONTACTED'),
    );
  }

  /** A patient's open commitments of any kind (referral-linked or not), scoped to patients in `context` — shared by every commitment-backed filter (NS-11, NS-15). */
  private scopedCommitmentRows<T extends { patientId: Id; dueDate: Date; referralId?: Id }>(
    context: RoleContext,
    commitments: T[],
  ): WorklistRow[] {
    const inScope = new Set(this.patientsInScope(context).map((p) => p.id));
    return commitments
      .filter((c) => inScope.has(c.patientId))
      .map((c) => {
        const patient = this.getPatientSync(c.patientId);
        return patient
          ? { ...patient, referralId: c.referralId, dueDate: c.dueDate }
          : ({ id: c.patientId, referralId: c.referralId, dueDate: c.dueDate } as WorklistRow);
      });
  }

  /** NS-1, NS-11: scope precedes filter for every one of the eight named filters — no filter widens past it. */
  async worklist(context: RoleContext, filter: WorklistFilter): Promise<WorklistRow[]> {
    const now = new Date();
    this.syncEscalation(now);
    let result: WorklistRow[];
    switch (filter) {
      case 'ALL_REGISTERED':
        result = this.patientsInScope(context);
        break;
      case 'REFERRAL_PENDING':
        result = this.referralPendingRows(context);
        break;
      case 'ANC_DUE':
        result = this.scopedCommitmentRows(context, this.state.ancVisitCommitments);
        break;
      case 'PMSMA_DUE':
        result = this.scopedCommitmentRows(
          context,
          this.state.pmsmaCommitments.map((c) => ({ id: c.id, patientId: c.patientId, dueDate: c.sessionDate })),
        );
        break;
      case 'PRIVATE_CARE_DUE':
        // NS-15: a discovery commitment is itself an undated private-care
        // follow-up — NS-11 permits filter overlap, and the ANM must see it
        // here even before a date is known (TC-TRK-002), alongside every
        // ordinary, dated private-follow-up commitment.
        result = this.scopedCommitmentRows(context, [
          ...this.state.privateCareCommitments,
          ...this.state.discoveryCommitments,
        ]);
        break;
      case 'TRACKING_NEEDED':
        result = this.scopedCommitmentRows(context, this.state.discoveryCommitments);
        break;
      case 'AT_RISK_OF_DROP_OUT':
        result = this.patientsInScope(context).filter((p) => this.isAtRiskOfDropOut(p.id));
        break;
      case 'LOST_TO_FOLLOW':
        result = this.patientsInScope(context).filter((p) => this.isLostToFollow(p.id));
        break;
    }
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** NS-4: `expectedAtFacilityId` must resolve to a configured, referral-eligible facility (NS-2) — free text and unconfigured ids are rejected. */
  async raiseReferral(patientId: Id, input: RaiseReferralInput, context: RoleContext): Promise<Referral> {
    if (!isValidReferralDestination(input.expectedAtFacilityId)) {
      throw new Error(
        `NS-2: '${input.expectedAtFacilityId}' is not a configured referral destination.`,
      );
    }
    const referral: Referral = {
      id: uid('ref'),
      patientId,
      cat: 'SPECIALIST_REFERRAL',
      expectedAtFacilityId: input.expectedAtFacilityId,
      direction: input.direction,
      raisedByRole: context.role,
      raisedByScope: context.scope ?? context.facilityId,
      raisedAt: new Date(),
      status: 'PENDING',
      escalationCount: 0,
    };
    this.state.referrals = [referral, ...this.state.referrals];
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return referral;
  }

  /**
   * NS-4: a referral is expected to arrive the day after it is raised; a
   * facility calendar day beyond that with no arrival makes it overdue. This
   * is display state derived on read, never stored — the same precedent as
   * `deriveOverdue` for an ordinary step's due date (§11.1).
   */
  private arrivalStatus(referral: Referral, now: Date): ArrivalRow['status'] {
    const expectedByIndex = clinicDayIndex(referral.raisedAt) + 1;
    return clinicDayIndex(now) > expectedByIndex ? 'OVERDUE' : 'PENDING';
  }

  /** NS-4: the facility's arrival worklist — open referrals expected there, until resolved. */
  async arrivalWorklist(context: RoleContext): Promise<ArrivalRow[]> {
    const now = new Date();
    this.syncEscalation(now);
    const result = this.state.referrals
      .filter((r) => r.expectedAtFacilityId === context.facilityId && r.status === 'PENDING')
      .map((r) => ({
        id: r.id,
        patientId: r.patientId,
        expectedAtFacilityId: r.expectedAtFacilityId,
        direction: r.direction,
        status: this.arrivalStatus(r, now),
      }));
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** A single referral, read back by id — e.g. to confirm a closed referral was not mutated into an onward one (NS-4). */
  async getReferral(referralId: Id): Promise<Referral | undefined> {
    this.syncEscalation(new Date());
    const result = this.state.referrals.find((r) => r.id === referralId);
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /**
   * NS-5: attribution is FACILITY_CONFIRMED only when the closer is the
   * expecting facility itself; every other closer — an ANM or ASHA acting on
   * tracking — is REPORTED. Both are permitted.
   */
  private referralAttribution(referral: Referral, context: RoleContext) {
    const isExpectingFacility =
      (context.role === 'PHC_SN' || context.role === 'DH_SN') && context.facilityId === referral.expectedAtFacilityId;
    return isExpectingFacility ? 'FACILITY_CONFIRMED' : 'REPORTED';
  }

  /**
   * NS-5, NS-6: resolves a referral in place — it is the same record,
   * transitioned to COMPLETED, never mutated into an onward one. An onward
   * referral is always a fresh `raiseReferral` call (TC-REF-005). Shared by
   * closeReferral and recordTrackingOutcome's three "completed" leaves.
   */
  private resolveReferral(
    referral: Referral,
    context: RoleContext,
    completionLocation: CompletionLocation,
    now: Date,
  ): void {
    referral.status = 'COMPLETED';
    referral.closedByRole = context.role;
    referral.attribution = this.referralAttribution(referral, context);
    referral.completionLocation = completionLocation;
    referral.closedAt = now;
  }

  async closeReferral(referralId: Id, context: RoleContext, input?: CloseReferralInput): Promise<Referral> {
    const referral = this.state.referrals.find((r) => r.id === referralId);
    if (!referral) throw new Error(`Unknown referral ${referralId}`);
    this.resolveReferral(referral, context, input?.completionLocation ?? 'REFERRED_PUBLIC_FACILITY', new Date());
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return referral;
  }

  /** NS-7: maps each "completed" tracking-outcome leaf to NS-6's CompletionLocation vocabulary — the three resolve, sharing resolveReferral with closeReferral. */
  private static readonly COMPLETED_OUTCOME_LOCATIONS: Partial<Record<TrackingOutcome, CompletionLocation>> = {
    COMPLETED_REFERRED_PUBLIC_FACILITY: 'REFERRED_PUBLIC_FACILITY',
    COMPLETED_OTHER_PUBLIC_FACILITY: 'OTHER_PUBLIC_FACILITY',
    COMPLETED_PRIVATE_FACILITY: 'PRIVATE_FACILITY',
  };

  /**
   * NS-15: private closure with a supplied follow-up date creates one
   * ordinary follow-up commitment, due on that date. With no date, it
   * creates a discovery commitment instead — owned by ANM_CHO, resolvable by
   * ASHA, due within the profile's escalation window — so the patient is
   * never absent from every worklist filter (the failure NS-15 exists to
   * prevent).
   */
  private applyPrivateClosure(referral: Referral, followUpDate: Date | undefined, now: Date): void {
    if (followUpDate) {
      this.state.privateCareCommitments = [
        ...this.state.privateCareCommitments,
        { id: uid('pcc'), patientId: referral.patientId, referralId: referral.id, dueDate: followUpDate, createdAt: now },
      ];
      return;
    }
    const dueDate = new Date(now.getTime() + getEscalationWindowDays(this.profile) * DAY_MS);
    this.state.discoveryCommitments = [
      ...this.state.discoveryCommitments,
      { id: uid('disc'), patientId: referral.patientId, referralId: referral.id, dueDate, createdAt: now },
    ];
  }

  /**
   * NS-7: records one of the six tracking-outcome leaves. The three
   * "completed" leaves resolve the referral (NS-6); COMPLETED_PRIVATE_FACILITY
   * additionally applies NS-15. PLAN_TO_GO_LATER resets the escalation clock
   * without touching escalationCount (NS-8) — the referral's escalation is
   * first caught up to `now` under the old clock, then the clock alone
   * resets. DOES_NOT_WANT_TO_GO and COULD_NOT_BE_CONTACTED record the
   * outcome (feeding NS-9's LOST_TO_FOLLOW) and otherwise leave the referral
   * exactly as it was — neither resolves it nor resets its clock.
   */
  async recordTrackingOutcome(
    referralId: Id,
    input: RecordTrackingOutcomeInput,
    context: RoleContext,
  ): Promise<Referral> {
    const now = new Date();
    this.syncEscalation(now);
    const referral = this.state.referrals.find((r) => r.id === referralId);
    if (!referral) throw new Error(`Unknown referral ${referralId}`);

    referral.lastTrackingOutcome = input.outcome;
    // NS-14: marks this outcome as "new" for the LOST_TO_FOLLOW badge.
    this.state.trackingOutcomeBadgeAt[referral.id] = now;

    const completionLocation = InMemoryCoordinationEngine.COMPLETED_OUTCOME_LOCATIONS[input.outcome];
    if (completionLocation) {
      this.resolveReferral(referral, context, completionLocation, now);
      if (input.outcome === 'COMPLETED_PRIVATE_FACILITY') {
        this.applyPrivateClosure(referral, input.privateFollowUpDate, now);
      }
    } else if (input.outcome === 'PLAN_TO_GO_LATER') {
      this.state.escalationClocks[referral.id] = now;
    }

    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return referral;
  }

  /** NS-8: who escalation would alert — the linked ASHA by name, and the ANM/CHO — derived from escalationCount rather than a persisted notification log. */
  async escalationAlerts(referralId: Id): Promise<EscalationAlert[]> {
    this.syncEscalation(new Date());
    const referral = this.state.referrals.find((r) => r.id === referralId);
    if (!referral || referral.escalationCount < 1) return [];
    const patient = this.getPatientSync(referral.patientId);
    const alerts: EscalationAlert[] = [{ referralId, recipientRole: 'ANM_CHO' }];
    if (patient?.ashaName) {
      alerts.push({ referralId, recipientRole: 'ASHA', ashaName: patient.ashaName });
    }
    await delay(SIMULATED_LATENCY_MS);
    return alerts;
  }

  /** NS-8: a reminder to the patient/family accompanies every escalation. */
  async patientReminderScheduled(referralId: Id): Promise<boolean> {
    this.syncEscalation(new Date());
    const referral = this.state.referrals.find((r) => r.id === referralId);
    const result = !!referral && referral.escalationCount >= 1;
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** NS-5: FACILITY_CONFIRMED and REPORTED closures for referrals in scope of `context`, counted separately — never merged. */
  async referralClosureSummary(context: RoleContext): Promise<ReferralClosureSummary> {
    const closed = this.state.referrals.filter((r) => this.referralInScope(r, context) && r.status === 'COMPLETED');
    const result: ReferralClosureSummary = {
      facilityConfirmed: closed.filter((r) => r.attribution === 'FACILITY_CONFIRMED').length,
      reported: closed.filter((r) => r.attribution === 'REPORTED').length,
    };
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** NS-6: referral resolution for referrals in scope of `context`, as a total with the public/private split available separately. */
  async referralResolutionSummary(context: RoleContext): Promise<ReferralResolutionSummary> {
    const closed = this.state.referrals.filter((r) => this.referralInScope(r, context) && r.status === 'COMPLETED');
    const priv = closed.filter((r) => r.completionLocation === 'PRIVATE_FACILITY').length;
    const result: ReferralResolutionSummary = {
      total: closed.length,
      public: closed.length - priv,
      private: priv,
    };
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** NS-18(vi): a distinct, dashboard-scoped "lost to follow" — "does not want to go" ONLY. Never touches NS-9's own `isLostToFollow` (which also treats "could not be contacted" as lost, for LOST_TO_FOLLOW and elsewhere). */
  private isLostToFollowUpDashboard(patientId: Id): boolean {
    return this.state.referrals.some(
      (r) => r.patientId === patientId && r.status === 'PENDING' && r.lastTrackingOutcome === 'DOES_NOT_WANT_TO_GO',
    );
  }

  /** NS-18: six HRP-scoped dashboard figures, derived on read (§11.1 precedent) — never stored. */
  async dashboardViews(): Promise<HrpDashboardViews> {
    const now = new Date();
    this.syncEscalation(now);

    // NS-12/NS-17: only a maternal-profile registration ever sets
    // pregnancyStatus, so "registered pregnant women" is exactly the
    // patients that field is set on — this is what keeps a deployment's
    // other seeded/unrelated patients (no pregnancyStatus at all) out of
    // both this denominator and every other figure below.
    const registered = this.allPatientsSync().filter((p) => p.pregnancyStatus !== undefined);
    const hrp = registered.filter((p) => p.pregnancyStatus === 'HIGH_RISK');
    const totalRegistered = registered.length;
    const hrpCount = hrp.length;

    const referralsPending = hrp.filter((p) =>
      this.state.referrals.some((r) => r.patientId === p.id && r.status === 'PENDING'),
    ).length;

    const steps = this.allSteps();
    const ancOverdueCount = hrp.filter((p) =>
      steps.some(
        (s) => s.pid === p.id && s.cat === 'FOLLOW_UP_VISIT' && deriveOverdue(s.dueDate, s.status, now).isOverdue,
      ),
    ).length;

    const pmsmaLabel = getCategoryLabel('OTHER', this.profile);
    const pmsmaOverdueCount = hrp.filter((p) =>
      steps.some(
        (s) =>
          s.pid === p.id &&
          s.cat === 'OTHER' &&
          s.detail === pmsmaLabel &&
          deriveOverdue(s.dueDate, s.status, now).isOverdue,
      ),
    ).length;

    // NS-18(v): reuses NS-9's own isAtRiskOfDropOut — not a reimplementation.
    const atRiskOfDropOutIds = hrp.filter((p) => this.isAtRiskOfDropOut(p.id)).map((p) => p.id);

    // NS-18(vi): the distinct dashboard-scoped derivation above, not isLostToFollow.
    const lostToFollowUpCount = hrp.filter((p) => this.isLostToFollowUpDashboard(p.id)).length;

    await delay(SIMULATED_LATENCY_MS);
    return {
      totalRegistered,
      hrpCount,
      hrpPercentage: totalRegistered === 0 ? 0 : Math.round((hrpCount / totalRegistered) * 100),
      referralsPending,
      ancOverdueCount,
      pmsmaOverdueCount,
      atRiskOfDropOutIds,
      lostToFollowUpCount,
    };
  }

  /** NS-19: four HRP-scoped dashboard insights, derived on read. */
  async dashboardInsights(): Promise<HrpDashboardInsights> {
    const now = new Date();
    this.syncEscalation(now);

    const hrpIds = new Set(
      this.allPatientsSync()
        .filter((p) => p.pregnancyStatus === 'HIGH_RISK')
        .map((p) => p.id),
    );

    // NS-19(i): reuses NS-6's own CompletionLocation vocabulary and its
    // COMPLETED_OUTCOME_LOCATIONS map — the three-way split is a finer read
    // of the same `completionLocation` field NS-6 already populates, not a
    // separate concept.
    const hrpReferrals = this.state.referrals.filter((r) => hrpIds.has(r.patientId));
    const resolved = hrpReferrals.filter((r) => r.status === 'COMPLETED');
    const referralClosure = {
      totalResolved: resolved.length,
      pending: hrpReferrals.filter((r) => r.status === 'PENDING').length,
      referredPublicFacility: resolved.filter((r) => r.completionLocation === 'REFERRED_PUBLIC_FACILITY').length,
      otherPublicFacility: resolved.filter((r) => r.completionLocation === 'OTHER_PUBLIC_FACILITY').length,
      privateFacility: resolved.filter((r) => r.completionLocation === 'PRIVATE_FACILITY').length,
    };

    // NS-19(ii): completed ÷ due FOLLOW_UP_VISIT (ANC) steps — planned dates
    // met. No gestational-age or LMP field exists anywhere in the type
    // system to derive a protocol window from (types.ts's WorkStep carries
    // none), so there is nothing here for that calculation to reach for.
    const steps = this.allSteps();
    const hrpAncSteps = steps.filter((s) => hrpIds.has(s.pid) && s.cat === 'FOLLOW_UP_VISIT');
    const ancCompleted = hrpAncSteps.filter((s) => s.status === 'COMPLETED').length;
    const ancComplianceRate = hrpAncSteps.length === 0 ? 0 : Math.round((ancCompleted / hrpAncSteps.length) * 100);

    // NS-19(iii): completed ÷ scheduled PMSMA-labelled OTHER steps, HRP-scoped only.
    const pmsmaLabel = getCategoryLabel('OTHER', this.profile);
    const hrpPmsmaSteps = steps.filter((s) => hrpIds.has(s.pid) && s.cat === 'OTHER' && s.detail === pmsmaLabel);
    const pmsmaAttended = hrpPmsmaSteps.filter((s) => s.status === 'COMPLETED').length;
    const pmsmaAttendanceRate =
      hrpPmsmaSteps.length === 0 ? 0 : Math.round((pmsmaAttended / hrpPmsmaSteps.length) * 100);

    // NS-19(iv): any of NS-7's three "completed" leaves ÷ every recorded
    // outcome, HRP-scoped — reuses the same COMPLETED_OUTCOME_LOCATIONS map
    // NS-6/NS-19(i) read, rather than a separate list of "completed" leaves.
    const hrpTracked = hrpReferrals.filter((r) => r.lastTrackingOutcome !== undefined);
    const trackingCompleted = hrpTracked.filter(
      (r) => r.lastTrackingOutcome && InMemoryCoordinationEngine.COMPLETED_OUTCOME_LOCATIONS[r.lastTrackingOutcome],
    ).length;
    const trackingSuccessRate =
      hrpTracked.length === 0 ? 0 : Math.round((trackingCompleted / hrpTracked.length) * 100);

    await delay(SIMULATED_LATENCY_MS);
    return {
      referralClosure,
      ancComplianceRate,
      ancComplianceLabel: 'planned date met',
      pmsmaAttendanceRate,
      trackingSuccessRate,
    };
  }

  /** NS-3 decision ("ANC scheduling is manual"): records an ANC visit due on `dueDate`, entered by whoever decided it. Populates ANC_DUE (NS-11). */
  async scheduleAncVisit(patientId: Id, dueDate: Date, _context: RoleContext): Promise<WorklistRow> {
    const now = new Date();
    const commitment: AncVisitCommitment = { id: uid('anc'), patientId, dueDate, createdAt: now };
    this.state.ancVisitCommitments = [...this.state.ancVisitCommitments, commitment];
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    const patient = this.getPatientSync(patientId);
    return patient ? { ...patient, dueDate } : ({ id: patientId, dueDate } as WorklistRow);
  }

  /** NS-10: attaches the patient to her village's next fixed-calendar PMSMA session date — the 9th of the month, not an offset from this call. Populates PMSMA_DUE (NS-11). */
  async schedulePmsma(patientId: Id, _context: RoleContext): Promise<WorklistRow> {
    const now = new Date();
    const sessionDate = nextPmsmaSessionDate(now);
    const patient = this.getPatientSync(patientId);
    const commitment: PmsmaCommitment = {
      id: uid('pmsma'),
      patientId,
      villageName: patient?.villageName,
      sessionDate,
      createdAt: now,
    };
    this.state.pmsmaCommitments = [...this.state.pmsmaCommitments, commitment];
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return patient ? { ...patient, dueDate: sessionDate } : ({ id: patientId, dueDate: sessionDate } as WorklistRow);
  }

  /** NS-14: a stable key identifying a role context's own worklist — distinct roles/scopes/facilities never share a badge state. */
  private contextKey(context: RoleContext): string {
    return `${context.role}:${context.scope ?? ''}:${context.facilityId ?? ''}`;
  }

  /** NS-14: this context's last-opened timestamp for `filter`, or epoch if it has never opened it — so every currently-relevant item counts as unread. */
  private filterOpenedSince(context: RoleContext, filter: WorklistFilter): number {
    return this.state.filterOpenedAt[this.contextKey(context)]?.[filter]?.getTime() ?? 0;
  }

  /**
   * NS-14: the ids of items newly relevant to each filter since this context
   * last opened it — referral ids for the referral-derived filters,
   * commitment ids for the commitment-derived ones. ALL_REGISTERED has no
   * "since" signal to derive from (Patient carries no creation timestamp)
   * and is left out rather than guessed.
   */
  private unreadIdsByFilter(context: RoleContext): Partial<Record<WorklistFilter, Id[]>> {
    const inScopeIds = new Set(this.patientsInScope(context).map((p) => p.id));

    const referralPendingSince = this.filterOpenedSince(context, 'REFERRAL_PENDING');
    const referralPending = this.state.referrals.filter(
      (r) => r.status === 'PENDING' && this.referralInScope(r, context) && r.raisedAt.getTime() > referralPendingSince,
    );

    const atRiskSince = this.filterOpenedSince(context, 'AT_RISK_OF_DROP_OUT');
    const atRisk = this.state.referrals.filter((r) => {
      if (r.status !== 'PENDING' || r.escalationCount < 2 || !inScopeIds.has(r.patientId)) return false;
      const badgeAt = this.state.escalationBadgeAt[r.id];
      return !!badgeAt && badgeAt.getTime() > atRiskSince;
    });

    const lostSince = this.filterOpenedSince(context, 'LOST_TO_FOLLOW');
    const lost = this.state.referrals.filter((r) => {
      if (r.status !== 'PENDING' || !inScopeIds.has(r.patientId)) return false;
      if (r.lastTrackingOutcome !== 'DOES_NOT_WANT_TO_GO' && r.lastTrackingOutcome !== 'COULD_NOT_BE_CONTACTED') return false;
      const badgeAt = this.state.trackingOutcomeBadgeAt[r.id];
      return !!badgeAt && badgeAt.getTime() > lostSince;
    });

    const trackingNeededSince = this.filterOpenedSince(context, 'TRACKING_NEEDED');
    const trackingNeeded = this.state.discoveryCommitments.filter(
      (c) => inScopeIds.has(c.patientId) && c.createdAt.getTime() > trackingNeededSince,
    );

    const privateCareDueSince = this.filterOpenedSince(context, 'PRIVATE_CARE_DUE');
    const privateCareDue = [...this.state.privateCareCommitments, ...this.state.discoveryCommitments].filter(
      (c) => inScopeIds.has(c.patientId) && c.createdAt.getTime() > privateCareDueSince,
    );

    const ancDueSince = this.filterOpenedSince(context, 'ANC_DUE');
    const ancDue = this.state.ancVisitCommitments.filter(
      (c) => inScopeIds.has(c.patientId) && c.createdAt.getTime() > ancDueSince,
    );

    const pmsmaDueSince = this.filterOpenedSince(context, 'PMSMA_DUE');
    const pmsmaDue = this.state.pmsmaCommitments.filter(
      (c) => inScopeIds.has(c.patientId) && c.createdAt.getTime() > pmsmaDueSince,
    );

    return {
      REFERRAL_PENDING: referralPending.map((r) => r.id),
      AT_RISK_OF_DROP_OUT: atRisk.map((r) => r.id),
      LOST_TO_FOLLOW: lost.map((r) => r.id),
      TRACKING_NEEDED: trackingNeeded.map((c) => c.id),
      PRIVATE_CARE_DUE: privateCareDue.map((c) => c.id),
      ANC_DUE: ancDue.map((c) => c.id),
      PMSMA_DUE: pmsmaDue.map((c) => c.id),
    };
  }

  /**
   * NS-14: the worklist entry point total and each filter's own unread
   * count. Total is the count of distinct underlying items across all
   * filters, not a sum — an item newly relevant to two filters at once
   * (e.g. a referral that is both REFERRAL_PENDING and newly
   * AT_RISK_OF_DROP_OUT) is one unread thing, not two.
   */
  async unreadCounts(context: RoleContext): Promise<UnreadCounts> {
    this.syncEscalation(new Date());
    const byFilterIds = this.unreadIdsByFilter(context);
    const byFilter: Partial<Record<WorklistFilter, number>> = {};
    const allIds = new Set<Id>();
    for (const [filter, ids] of Object.entries(byFilterIds) as [WorklistFilter, Id[]][]) {
      byFilter[filter] = ids.length;
      ids.forEach((id) => allIds.add(id));
    }
    const result: UnreadCounts = { total: allIds.size, byFilter };
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** NS-14: clears the unread count for exactly this (context, filter) pair — every other filter, and every other context's badges, are untouched. */
  async markFilterOpened(context: RoleContext, filter: WorklistFilter): Promise<void> {
    const now = new Date();
    const key = this.contextKey(context);
    this.state.filterOpenedAt = {
      ...this.state.filterOpenedAt,
      [key]: { ...this.state.filterOpenedAt[key], [filter]: now },
    };
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  // --- capture ------------------------------------------------------------

  async recordVisit(
    patientId: Id,
    steps: CaptureInput[],
    options?: VisitOptions,
  ): Promise<RecordVisitResult> {
    if (steps.length === 0) {
      // Used as a no-op "nudge" call today (no visit to anchor an empty
      // capture to) — nothing is validated or persisted.
      await delay(SIMULATED_LATENCY_MS);
      const now = new Date();
      return {
        visitId: '',
        stepIds: [],
        visit: {
          visitId: '',
          patientId,
          doctorId: options?.doctorId ?? '',
          visitDateTime: now,
          isBackdated: false,
          createdBy: options?.createdBy ?? '',
          createdAt: now,
        },
      };
    }

    // BR-005: every Next Step has exactly one mandatory due date — rejected,
    // and nothing persisted (not even the visit), before any state changes.
    for (const s of steps) {
      if (!s.dueKey || !(s.dueKey in DUE)) {
        throw new Error('Every next step requires a due date (BR-005).');
      }
    }

    // No BR requires patientId to resolve to an existing patient record here;
    // a step's `pid` is an opaque foreign key, so an unresolved id degrades
    // to an empty display name rather than rejecting the capture.
    const patient = this.getPatientSync(patientId);

    const now = new Date();
    const visitDateTime = options?.visitDateTime ?? now;
    const isBackdated = resolveIsBackdated(visitDateTime, now);

    const visit: Visit = {
      visitId: uid('visit'),
      patientId,
      doctorId: options?.doctorId ?? '',
      visitDateTime,
      isBackdated,
      createdBy: options?.createdBy ?? '',
      createdAt: now,
    };

    const stepIds: Id[] = [];
    const newSteps: WorkStep[] = steps.map((s) => {
      const id = uid('w');
      stepIds.push(id);
      return {
        id,
        pid: patientId,
        visitId: visit.visitId,
        name: patient?.name ?? '',
        cat: s.cat,
        detail: getCategoryLabel(s.cat, this.profile),
        dueDate: s.dueDate ?? new Date(now.getTime() + DUE[s.dueKey].days * DAY_MS),
        priority: s.priority,
        delivery: 'Sent',
        attempts: 0,
        status: 'SCHEDULED',
      };
    });

    this.state.createdVisits = [visit, ...this.state.createdVisits];
    this.state.createdSteps = [...newSteps, ...this.state.createdSteps];
    for (const step of newSteps) {
      await this.writeEvent(step, 'CREATED');
    }
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return { visitId: visit.visitId, stepIds, visit };
  }

  // --- worklist -----------------------------------------------------------

  /** FR-A-6.1, §11.3: section membership is derived per step on every call, never stored. */
  private sectionsSync(
    filter: Category | 'all',
    unreachableThreshold: number = DEFAULT_UNREACHABLE_THRESHOLD,
  ): WorklistSections {
    const buckets: Record<WorklistSection, WorkStep[]> = { overdue: [], today: [], soon: [], unreach: [] };
    for (const w of this.openSteps()) {
      if (filter !== 'all' && w.cat !== filter) continue;
      const section = deriveSection(w, unreachableThreshold);
      if (section) buckets[section].push(w);
    }
    return {
      overdue: orderSection(buckets.overdue.map((w) => decorate(w, new Date(), this.profile)), false),
      today: orderSection(buckets.today.map((w) => decorate(w, new Date(), this.profile)), false),
      soon: orderSection(buckets.soon.map((w) => decorate(w, new Date(), this.profile)), false),
      unreach: orderSection(buckets.unreach.map((w) => decorate(w, new Date(), this.profile)), true),
    };
  }

  async sections(filter: Category | 'all', unreachableThreshold?: number): Promise<WorklistSections> {
    const result = this.sectionsSync(filter, unreachableThreshold);
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async doneRows(): Promise<DoneRow[]> {
    const result = this.allSteps()
      .filter((w) => w.status === 'COMPLETED')
      .map((w) => ({ name: w.name, detail: getCategoryLabel(w.cat, this.profile) }));
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async openTotal(filter: Category | 'all'): Promise<number> {
    const s = this.sectionsSync(filter);
    const result = s.overdue.length + s.today.length + s.soon.length + s.unreach.length;
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async openStepsForPatient(patientId: Id): Promise<DecoratedStep[]> {
    const result = this.openSteps()
      .filter((w) => w.pid === patientId)
      .map((w) => decorate(w, new Date(), this.profile));
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** §11.2: CREATED -> SCHEDULED, the one legal transition into an open state. */
  async scheduleStep(id: Id, byUser: Id = SYSTEM_ACTOR): Promise<void> {
    const step = this.materialize(id);
    if (!step) throw new Error(`Unknown step ${id}`);
    if (step.status !== 'CREATED') {
      throw new Error(
        `Cannot schedule step ${id}: only a CREATED step may move to SCHEDULED (current status ${step.status}) (§11.2).`,
      );
    }
    this.appendHistory(step, 'SCHEDULED', byUser);
    step.status = 'SCHEDULED';
    await this.writeEvent(step, 'STATUS_CHANGED');
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  /** §10.3/FR-A-7.1: completedDate must fall within [visit date, today], inclusive. */
  async completeStep(id: Id, completedDate?: Date, completedBy: Id = SYSTEM_ACTOR): Promise<void> {
    const step = this.materialize(id);
    if (!step) throw new Error(`Unknown step ${id}`);
    assertNotTerminal(step, 'complete');

    const now = new Date();
    const date = completedDate ?? now;
    if (clinicDayIndex(date) > clinicDayIndex(now)) {
      throw new Error(`Completion date cannot be in the future (FR-A-7.1): ${date.toISOString()}.`);
    }
    const visit = this.allVisits().find((v) => v.visitId === step.visitId);
    if (visit && clinicDayIndex(date) < clinicDayIndex(visit.visitDateTime)) {
      throw new Error(`Completion date cannot be before the visit date (FR-A-7.1): ${date.toISOString()}.`);
    }

    this.appendHistory(step, 'COMPLETED', completedBy, null, date);
    step.status = 'COMPLETED';
    step.completedDate = date;
    step.completedBy = completedBy;
    await this.writeEvent(step, 'COMPLETED');
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  /** BR-013: cancellation always requires a reason. */
  async cancelStep(id: Id, reason: string): Promise<void> {
    const step = this.materialize(id);
    if (!step) throw new Error(`Unknown step ${id}`);
    assertNotTerminal(step, 'cancel');
    if (!reason || !reason.trim()) {
      throw new Error('Cancelling a step requires a reason (BR-013).');
    }
    this.appendHistory(step, 'CANCELLED', SYSTEM_ACTOR, reason);
    step.status = 'CANCELLED';
    step.reason = reason;
    await this.writeEvent(step, 'CANCELLED');
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  /** §11.2: unlike cancel, a decline reason is optional — a patient declining care is a real outcome, not a correction. */
  async declineStep(id: Id, reason?: string): Promise<void> {
    const step = this.materialize(id);
    if (!step) throw new Error(`Unknown step ${id}`);
    assertNotTerminal(step, 'decline');
    this.appendHistory(step, 'DECLINED', SYSTEM_ACTOR, reason ?? null);
    step.status = 'DECLINED';
    step.declineReason = reason ?? null;
    // §10.5: DECLINED has no eventType of its own — it lands under STATUS_CHANGED.
    await this.writeEvent(step, 'STATUS_CHANGED');
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  /** FR-A-7.3/BR-007: the sole exit from a terminal state, and only within the reopen window. */
  async reopenStep(id: Id, byUser: Id = SYSTEM_ACTOR): Promise<void> {
    const step = this.materialize(id);
    if (!step) throw new Error(`Unknown step ${id}`);
    if (step.status !== 'COMPLETED') {
      throw new Error(
        `Cannot reopen step ${id}: only a COMPLETED step may reopen to SCHEDULED (current status ${step.status}) (§11.2).`,
      );
    }
    if (!step.completedDate) {
      throw new Error(`Cannot reopen step ${id}: no completion date is recorded.`);
    }
    const elapsedMs = new Date().getTime() - step.completedDate.getTime();
    if (elapsedMs > REOPEN_WINDOW_MS) {
      throw new Error(`Cannot reopen step ${id}: the 48 hours reopen window has passed (FR-A-7.3).`);
    }
    this.appendHistory(step, 'SCHEDULED', byUser);
    step.status = 'SCHEDULED';
    step.completedDate = null;
    step.completedBy = null;
    await this.writeEvent(step, 'STATUS_CHANGED');
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  // --- doctor -------------------------------------------------------------

  async summaryCards(): Promise<SummaryCard[]> {
    const now = new Date();
    const open = this.openSteps();
    const result = CARD_DEFS.map((c) => ({
      key: c.key,
      value: open.filter((w) => matchesDrillKey(c.key, w, DEFAULT_UNREACHABLE_THRESHOLD, now)).length,
      label: c.label,
      color: c.color,
      soft: c.soft,
      iconPath: c.iconPath,
    }));
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async heroAttn(): Promise<number> {
    const result = patientsNeedingAttention(this.openSteps(), DEFAULT_UNREACHABLE_THRESHOLD, new Date());
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async drill(key: DrillKey): Promise<DrillView> {
    const now = new Date();
    const meta = DRILL_META[key] ?? { title: '', sub: '' };
    const rows: DrillRow[] = this.openSteps()
      .filter((w) => matchesDrillKey(key, w, DEFAULT_UNREACHABLE_THRESHOLD, now))
      .map((w) => {
        const m = META[w.cat];
        const isUnreach = deriveSection(w) === 'unreach';
        const label = formatDueLabel(w.dueDate, now);
        const { isOverdue, daysOverdue } = deriveOverdue(w.dueDate, w.status, now);
        return {
          id: w.id,
          pid: w.pid,
          patientName: w.name,
          detail: getCategoryLabel(w.cat, this.profile),
          dueDate: label === 'Today' ? 'due today' : 'due ' + label,
          color: m.color,
          soft: m.soft,
          iconPath: m.iconPath,
          badge: isUnreach ? w.attempts + ' attempts' : isOverdue ? daysOverdue + 'd overdue' : 'Due ' + label,
          badgeColor: isUnreach || isOverdue ? '#994242' : '#C35721',
          delivery: w.delivery === '—' ? 'call step' : w.delivery,
        };
      });
    const result = { title: meta.title, sub: meta.sub, rows };
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** FR-D-3, BR-018: every figure below is computed by the §13 functions in logic.ts, over live state. */
  async insights(periodDays: number): Promise<Insights> {
    const now = new Date();
    const steps = this.stepsWithVisitDate();
    const open = this.openSteps();

    const overall = completionRate(steps, periodDays, now);
    const prevNow = new Date(now.getTime() - periodDays * DAY_MS);
    const prevOverall = completionRate(steps, periodDays, prevNow);
    // FR-D-3.1: a delta needs a comparable prior period — no eligible steps
    // then means no baseline, not a 0% baseline.
    const prevHasData = prevOverall.denominator > 0;

    const TREND_POINTS = 5;
    const MIN_TREND_POINTS_FOR_DISPLAY = 3;
    const trendStepDays = Math.max(1, Math.round(periodDays / (TREND_POINTS - 1)));
    const trend = Array.from({ length: TREND_POINTS }, (_, i) => {
      const anchor = new Date(now.getTime() - (TREND_POINTS - 1 - i) * trendStepDays * DAY_MS);
      const r = completionRate(steps, periodDays, anchor);
      return r.denominator === 0 ? null : r.rate;
    });
    const trendHasEnoughData = trend.filter((v) => v !== null).length >= MIN_TREND_POINTS_FOR_DISPLAY;

    const catBars = INSIGHTS_CATEGORIES.map((cat) => {
      const r = completionRate(
        steps.filter((s) => s.cat === cat),
        periodDays,
        now,
      );
      return {
        label: getCategoryLabel(cat, this.profile),
        pctLabel: formatRateWithDenominator(r.numerator, r.denominator),
        width: `${r.rate}%`,
        color: META[cat].color,
      };
    });

    const buckets = overdueBuckets(open, now);
    const backlog = backlogBars([
      buckets['1-7'].length,
      buckets['8-30'].length,
      buckets['31-90'].length,
      buckets['90+'].length,
    ]);

    const referralSteps = steps.filter((s) => s.cat === 'SPECIALIST_REFERRAL');
    const referralRate = completionRate(referralSteps, periodDays, now);
    const medians = medianDaysToCompletion(steps, periodDays, now);
    const overallMedianDays = Number.isFinite(medians.overall) ? medians.overall : 0;

    const eligible = steps.filter((s) => s.status !== 'CANCELLED' && inPeriod(s.dueDate, periodDays, now));
    const patientsContacted = new Set(eligible.map((s) => s.pid)).size;
    const callsCompleted = completionRate(
      steps.filter((s) => s.cat === 'FOLLOW_UP_CALL'),
      periodDays,
      now,
    ).numerator;
    const unreachable = unreachablePatients(open, DEFAULT_UNREACHABLE_THRESHOLD);
    const lost = lostToFollowUp(
      this.patientsForLostToFollowUp(),
      { threshold: DEFAULT_UNREACHABLE_THRESHOLD, lostToFollowUpDays: LOST_TO_FOLLOW_UP_DAYS },
      now,
    );

    const result: Insights = {
      completionRate: overall.rate,
      completionOf: `${overall.numerator} of ${overall.denominator}`,
      prevRate: prevHasData ? prevOverall.rate : null,
      deltaPts: prevHasData ? overall.rate - prevOverall.rate : null,
      trend,
      trendHasEnoughData,
      catBars,
      backlogBars: backlog,
      referral: {
        rate: referralRate.rate,
        ofLabel: `${referralRate.numerator} of ${referralRate.denominator} completed`,
        medianDays: medians.byCategory['SPECIALIST_REFERRAL'] ?? 0,
      },
      followThrough: [
        { value: String(patientsContacted), label: 'Patients contacted', color: '#1E14BE', bg: '#EFEDFF' },
        { value: String(callsCompleted), label: 'Follow-up calls completed', color: '#C35721', bg: '#FBEDE4' },
        { value: `${referralRate.rate}%`, label: 'Referral completion', color: '#6165DE', bg: '#EEEDFB' },
        { value: `${overallMedianDays} days`, label: 'Average days to complete', color: '#2E9E6B', bg: '#E4F7EE' },
        { value: String(unreachable), label: 'Patients unreachable', color: '#994242', bg: '#FDECEC' },
        { value: String(lost), label: 'Lost to follow-up', color: '#128C4A', bg: '#E4F7EE' },
      ],
      followThroughNote: 'Every figure comes only from next-step follow-through — never clinical outcomes.',
    };
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  /** ITEM-7-AI-INSIGHTS.md AI-1, AI-4: every step in the shape `answerQuestion` executes §13 functions over — no patient fields, and `specialty` is left for the caller to fall back on `cat`. */
  async insightsSteps(): Promise<InsightsStep[]> {
    const steps = this.stepsWithVisitDate();
    await delay(SIMULATED_LATENCY_MS);
    return steps.map((s) => ({
      id: s.id,
      pid: s.pid,
      cat: s.cat,
      dueDate: s.dueDate,
      visitDate: s.visitDate,
      status: s.status,
      completedDate: s.completedDate,
      attempts: s.attempts,
    }));
  }

  /** FR-D-2.3, §11.4: this patient's visits, most recent first, each with its steps and their history. */
  async patientTimeline(patientId: Id): Promise<TimelineVisit[]> {
    const now = new Date();
    const stepsByVisit = new Map<Id, WorkStep[]>();
    for (const w of this.allSteps().filter((w) => w.pid === patientId)) {
      const list = stepsByVisit.get(w.visitId);
      if (list) list.push(w);
      else stepsByVisit.set(w.visitId, [w]);
    }
    const result = this.allVisits()
      .filter((v) => v.patientId === patientId)
      .map((v) => ({
        visitId: v.visitId,
        visitDateTime: v.visitDateTime,
        steps: (stepsByVisit.get(v.visitId) ?? []).map((w) => decorate(w, now, this.profile)),
      }))
      .sort((a, b) => b.visitDateTime.getTime() - a.visitDateTime.getTime());
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  // --- device sync --------------------------------------------------------

  isOffline(): boolean {
    return this.state.offline;
  }

  pending(): number {
    return this.state.pending;
  }

  toggleOffline(): void {
    this.state.offline = !this.state.offline;
    if (!this.state.offline) this.state.pending = 0;
    this.commit();
  }

  async reset(): Promise<void> {
    this.state = emptyState();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }
}
