// Fake CCE: in-memory store persisted to localStorage, with same-origin live
// sync (BroadcastChannel + storage events). Swap this class for a real
// FHIR / Beckn client without touching any screen.
//
// One source of truth: every open-step view (patient screen, worklist, search
// badges, doctor counts) derives from `allSteps()` = seed fixture + steps the
// administrator captures, minus any that reached a terminal state.

import { DUE, META } from './catalog';
import {
  CARD_DEFS,
  DONE_BASE,
  DRILL,
  INSIGHTS_BY_PERIOD,
  PATIENTS,
  SEED_VISITS,
  WORK,
} from './seed';
import {
  clinicDayIndex,
  decorate,
  DEFAULT_UNREACHABLE_THRESHOLD,
  deriveOverdue,
  deriveSection,
  formatDueLabel,
  orderSection,
  type DecoratedStep,
} from './logic';
import type {
  CaptureInput,
  CoordinationEngine,
  DoneRow,
  DrillRow,
  DrillView,
  NewPatient,
  RecordVisitResult,
  StepView,
  VisitOptions,
  WorklistSections,
} from './engine';
import type {
  Category,
  DrillKey,
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

const STORAGE_KEY = 'next-steps-cce-v3';

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
}

function emptyState(): Persisted {
  return {
    createdPatients: [],
    createdSteps: [],
    createdVisits: [],
    offline: false,
    pending: 0,
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

  constructor() {
    this.state = this.load();
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(STORAGE_KEY);
        this.channel.onmessage = () => {
          this.state = this.load();
          this.emit();
        };
      }
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.state = this.load();
          this.emit();
        }
      });
    }
  }

  private load(): Persisted {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
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
    return [...this.state.createdSteps, ...WORK.filter((w) => !overridden.has(w.id))];
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
    const seed = WORK.find((w) => w.id === id);
    if (!seed) return undefined;
    const clone: WorkStep = { ...seed, history: seed.history ? seed.history.map((h) => ({ ...h })) : [] };
    this.state.createdSteps = [clone, ...this.state.createdSteps];
    return clone;
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
    return [...this.state.createdVisits, ...SEED_VISITS];
  }

  private async visitCount(): Promise<number> {
    const result = this.allVisits().length;
    await delay(SIMULATED_LATENCY_MS);
    return result;
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
    return [...this.state.createdPatients, ...PATIENTS].map((p) => this.withCounts(p));
  }

  private getPatientSync(id: Id): Patient | undefined {
    const p = [...this.state.createdPatients, ...PATIENTS].find((x) => x.id === id);
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
    const patient: Patient = {
      id: uid('pat'),
      name: input.name,
      mobile: input.mobile,
      gender: input.gender,
      age: input.age,
      cid: input.cid,
      consent: input.consent,
      last: 'Today',
      open: 0,
      overdue: 0,
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

    const patient = this.getPatientSync(patientId);
    if (!patient) {
      throw new Error(`Unknown patient ${patientId}`);
    }

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
      const m = META[s.cat];
      const id = uid('w');
      stepIds.push(id);
      return {
        id,
        pid: patientId,
        visitId: visit.visitId,
        name: patient.name,
        cat: s.cat,
        detail: m.label,
        dueDate: s.dueDate ?? new Date(now.getTime() + DUE[s.dueKey].days * DAY_MS),
        priority: s.priority,
        delivery: 'Sent',
        attempts: 0,
        status: 'SCHEDULED',
      };
    });

    this.state.createdVisits = [visit, ...this.state.createdVisits];
    this.state.createdSteps = [...newSteps, ...this.state.createdSteps];
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
      overdue: orderSection(buckets.overdue.map((w) => decorate(w)), false),
      today: orderSection(buckets.today.map((w) => decorate(w)), false),
      soon: orderSection(buckets.soon.map((w) => decorate(w)), false),
      unreach: orderSection(buckets.unreach.map((w) => decorate(w)), true),
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
      .map((w) => ({ name: w.name, detail: META[w.cat].label }));
    const result = [...DONE_BASE, ...fromSteps];
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
      .map((w) => decorate(w));
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
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  // --- doctor -------------------------------------------------------------

  async summaryCards(): Promise<SummaryCard[]> {
    const result = CARD_DEFS.map((c) => ({
      key: c.key,
      value: DRILL[c.key].rows.filter((id) => !this.isClosed(id)).length,
      label: c.label,
      color: c.color,
      soft: c.soft,
      iconPath: c.iconPath,
    }));
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async heroAttn(): Promise<number> {
    const ids = new Set<Id>();
    [...DRILL.overdue.rows, ...DRILL.unreach.rows]
      .filter((id) => !this.isClosed(id))
      .forEach((id) => {
        const w = WORK.find((x) => x.id === id);
        if (w) ids.add(w.pid);
      });
    const result = ids.size;
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async drill(key: DrillKey): Promise<DrillView> {
    const d = DRILL[key];
    const rows: DrillRow[] = d.rows
      .filter((id) => !this.isClosed(id))
      .map((id) => {
        const w = WORK.find((x) => x.id === id)!;
        const m = META[w.cat];
        const isUnreach = deriveSection(w) === 'unreach';
        const label = formatDueLabel(w.dueDate);
        const { isOverdue, daysOverdue } = deriveOverdue(w.dueDate, w.status);
        return {
          id: w.id,
          patientName: w.name,
          detail: m.label,
          dueDate: label === 'Today' ? 'due today' : 'due ' + label,
          color: m.color,
          soft: m.soft,
          iconPath: m.iconPath,
          badge: isUnreach ? w.attempts + ' attempts' : isOverdue ? daysOverdue + 'd overdue' : 'Due ' + label,
          badgeColor: isUnreach || isOverdue ? '#994242' : '#C35721',
          delivery: w.delivery === '—' ? 'call step' : w.delivery,
        };
      });
    const result = { title: d.title, sub: d.sub, rows };
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async insights(periodDays: number): Promise<Insights> {
    const result = INSIGHTS_BY_PERIOD[periodDays] ?? INSIGHTS_BY_PERIOD[30];
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
