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
import { decorate, orderSection, type DecoratedStep } from './logic';
import type {
  CaptureInput,
  CoordinationEngine,
  DoneRow,
  DrillRow,
  DrillView,
  NewPatient,
  RecordVisitResult,
  VisitOptions,
  WorklistSections,
} from './engine';
import type {
  Category,
  DrillKey,
  DueKey,
  Id,
  Insights,
  Patient,
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

const STORAGE_KEY = 'next-steps-cce-v3';

/** Simulated CCE network latency (PRD §17 stub mode). */
const SIMULATED_LATENCY_MS = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Which worklist bucket a freshly captured, future-dated step lands in. */
const SECTION_BY_DUE: Record<DueKey, WorklistSection> = {
  '3d': 'soon',
  '1w': 'soon',
  '2w': 'upcoming',
  '1m': 'upcoming',
  '3m': 'upcoming',
};

// The seed fixture uses section 'future' for its one not-yet-due step; treat it
// as 'upcoming' so it groups with newly captured far-out steps. Neither label
// is a worklist section (FR-A-6.1 defines exactly five), so steps carrying
// either value are excluded from every `pick()` below — they stay in the data
// (visible on the patient screen via openStepsForPatient) but not on the worklist.
function normalizeSection(s: WorklistSection): WorklistSection {
  return s === 'future' ? 'upcoming' : s;
}

interface Persisted {
  completed: Record<Id, boolean>;
  closed: Record<Id, boolean>;
  createdPatients: Patient[];
  createdSteps: WorkStep[];
  createdVisits: Visit[];
  offline: boolean;
  pending: number;
}

function emptyState(): Persisted {
  return {
    completed: {},
    closed: {},
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
    return !!this.state.completed[id] || !!this.state.closed[id];
  }

  // --- steps (single source of truth) -------------------------------------

  private allSteps(): WorkStep[] {
    return [...this.state.createdSteps, ...WORK];
  }

  private openSteps(): WorkStep[] {
    return this.allSteps().filter((w) => !this.isClosed(w.id));
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

  async getStep(id: Id): Promise<WorkStep | undefined> {
    const result = this.allSteps().find((w) => w.id === id);
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  private countsFor(pid: Id): { open: number; overdue: number } {
    const open = this.openSteps().filter((w) => w.pid === pid);
    return { open: open.length, overdue: open.filter((w) => w.over > 0).length };
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
        due: DUE[s.dueKey].date,
        over: 0,
        priority: s.priority,
        delivery: 'Sent',
        attempts: 0,
        section: SECTION_BY_DUE[s.dueKey],
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

  private sectionsSync(filter: Category | 'all'): WorklistSections {
    const pick = (section: WorklistSection): DecoratedStep[] =>
      orderSection(
        this.openSteps()
          .filter((w) => normalizeSection(w.section) === section && (filter === 'all' || w.cat === filter))
          .map(decorate),
      );
    return {
      overdue: pick('overdue'),
      today: pick('today'),
      soon: pick('soon'),
      unreach: pick('unreach'),
    };
  }

  async sections(filter: Category | 'all'): Promise<WorklistSections> {
    const result = this.sectionsSync(filter);
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async doneRows(): Promise<DoneRow[]> {
    const fromSteps = this.allSteps()
      .filter((w) => this.state.completed[w.id])
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
      .map(decorate);
    await delay(SIMULATED_LATENCY_MS);
    return result;
  }

  async completeStep(id: Id): Promise<void> {
    this.state.completed[id] = true;
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  async cancelStep(id: Id): Promise<void> {
    this.state.closed[id] = true;
    this.bump();
    this.commit();
    await delay(SIMULATED_LATENCY_MS);
  }

  async declineStep(id: Id): Promise<void> {
    this.state.closed[id] = true;
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
        const isUnreach = w.section === 'unreach';
        return {
          id: w.id,
          patientName: w.name,
          detail: m.label,
          dueDate: w.due === 'Today' ? 'due today' : 'due ' + w.due,
          color: m.color,
          soft: m.soft,
          iconPath: m.iconPath,
          badge: isUnreach ? w.attempts + ' attempts' : w.over > 0 ? w.over + 'd overdue' : 'Due ' + w.due,
          badgeColor: isUnreach || w.over > 0 ? '#994242' : '#C35721',
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
