// Fake CCE: in-memory store persisted to localStorage, with same-origin live
// sync (BroadcastChannel + storage events). Swap this class for a real
// FHIR / Beckn client without touching any screen.
//
// One source of truth: every open-step view (patient screen, worklist, search
// badges, doctor counts) derives from `allSteps()` = seed fixture + steps the
// administrator captures, minus any that reached a terminal state.

import { CATEGORY_ORDER, DUE, META } from './catalog';
import { getCategoryDefaultDue, getCategoryLabel, type ProgrammeProfile } from './profile';
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
  CaptureInput,
  CoordinationEngine,
  CoordinationEvent,
  Dispatcher,
  DispatcherMode,
  DoneRow,
  DrillRow,
  DrillView,
  EngineOptions,
  EventType,
  NewPatient,
  RecordVisitResult,
  StepView,
  TimelineVisit,
  VisitOptions,
  WorklistSections,
} from './engine';
import type { InsightsStep } from './insights';
import type {
  Category,
  Clinic,
  DrillKey,
  DueKey,
  HistoryEntry,
  Id,
  Insights,
  Patient,
  StepStatus,
  SummaryCard,
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

interface Persisted {
  createdPatients: Patient[];
  createdSteps: WorkStep[];
  createdVisits: Visit[];
  offline: boolean;
  pending: number;
  /** §10.5 CCE outbox — one CoordinationEvent per accepted lifecycle transition. */
  outbox: CoordinationEvent[];
}

function emptyState(): Persisted {
  return {
    createdPatients: [],
    createdSteps: [],
    createdVisits: [],
    offline: false,
    pending: 0,
    outbox: [],
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

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim().toLowerCase();
    const all = this.allPatientsSync();
    const result = !q
      ? all.slice(0, 6)
      : all.filter((p) => {
          const digits = q.replace(/\D/g, '');
          if (/\d/.test(q)) return digits.length >= 4 && p.mobile.replace(/\D/g, '').startsWith(digits);
          return p.name.toLowerCase().split(' ').some((t) => t.startsWith(q)) || p.name.toLowerCase().startsWith(q);
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
      identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: id }],
    };
    this.state.createdPatients = [patient, ...this.state.createdPatients];
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
    return patient;
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
    const fromSteps = this.allSteps()
      .filter((w) => w.status === 'COMPLETED')
      .map((w) => ({ name: w.name, detail: getCategoryLabel(w.cat, this.profile) }));
    const result = [...this.seedClinic.doneBase, ...fromSteps];
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

    const TREND_POINTS = 5;
    const trendStepDays = Math.max(1, Math.round(periodDays / (TREND_POINTS - 1)));
    const trend = Array.from({ length: TREND_POINTS }, (_, i) => {
      const anchor = new Date(now.getTime() - (TREND_POINTS - 1 - i) * trendStepDays * DAY_MS);
      return completionRate(steps, periodDays, anchor).rate;
    });

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
      prevRate: prevOverall.rate,
      deltaPts: overall.rate - prevOverall.rate,
      trend,
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
