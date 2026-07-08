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
  WorklistSection,
  WorkStep,
} from './types';

const STORAGE_KEY = 'next-steps-cce-v3';

/** Which worklist bucket a freshly captured, future-dated step lands in. */
const SECTION_BY_DUE: Record<DueKey, WorklistSection> = {
  '3d': 'soon',
  '1w': 'soon',
  '2w': 'upcoming',
  '1m': 'upcoming',
  '3m': 'upcoming',
};

// The seed fixture uses section 'future' for its one not-yet-due step; treat it
// as 'upcoming' so it renders alongside newly captured steps.
function normalizeSection(s: WorklistSection): WorklistSection {
  return s === 'future' ? 'upcoming' : s;
}

interface Persisted {
  completed: Record<Id, boolean>;
  closed: Record<Id, boolean>;
  createdPatients: Patient[];
  createdSteps: WorkStep[];
  offline: boolean;
  pending: number;
}

function emptyState(): Persisted {
  return { completed: {}, closed: {}, createdPatients: [], createdSteps: [], offline: false, pending: 0 };
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
          return { ...emptyState(), ...(JSON.parse(raw) as Persisted) };
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

  getStep(id: Id): WorkStep | undefined {
    return this.allSteps().find((w) => w.id === id);
  }

  private countsFor(pid: Id): { open: number; overdue: number } {
    const open = this.openSteps().filter((w) => w.pid === pid);
    return { open: open.length, overdue: open.filter((w) => w.over > 0).length };
  }

  private withCounts(p: Patient): Patient {
    return { ...p, ...this.countsFor(p.id) };
  }

  // --- patients -----------------------------------------------------------

  allPatients(): Patient[] {
    return [...this.state.createdPatients, ...PATIENTS].map((p) => this.withCounts(p));
  }

  searchPatients(query: string): Patient[] {
    const q = query.trim().toLowerCase();
    const all = this.allPatients();
    if (!q) return all.slice(0, 6);
    const digits = q.replace(/\D/g, '');
    return all.filter((p) => {
      if (/\d/.test(q)) return digits.length > 0 && p.mobile.replace(/\D/g, '').includes(digits);
      return p.name.toLowerCase().split(' ').some((t) => t.startsWith(q)) || p.name.toLowerCase().startsWith(q);
    });
  }

  getPatient(id: Id): Patient | undefined {
    const p = [...this.state.createdPatients, ...PATIENTS].find((x) => x.id === id);
    return p ? this.withCounts(p) : undefined;
  }

  createPatient(input: NewPatient): Patient {
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
    return patient;
  }

  // --- capture ------------------------------------------------------------

  recordVisit(patientId: Id, steps: CaptureInput[]): void {
    if (steps.length === 0) return;
    const patient = this.getPatient(patientId);
    if (!patient) return;
    for (const s of steps) {
      const m = META[s.cat];
      this.state.createdSteps.unshift({
        id: uid('w'),
        pid: patientId,
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
      });
    }
    this.bump();
    this.commit();
  }

  // --- worklist -----------------------------------------------------------

  sections(filter: Category | 'all'): WorklistSections {
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
      upcoming: pick('upcoming'),
    };
  }

  doneRows(): DoneRow[] {
    const fromSteps = this.allSteps()
      .filter((w) => this.state.completed[w.id])
      .map((w) => ({ name: w.name, detail: META[w.cat].label }));
    return [...DONE_BASE, ...fromSteps];
  }

  openTotal(filter: Category | 'all'): number {
    const s = this.sections(filter);
    return s.overdue.length + s.today.length + s.soon.length + s.unreach.length + s.upcoming.length;
  }

  openStepsForPatient(patientId: Id): DecoratedStep[] {
    return this.openSteps()
      .filter((w) => w.pid === patientId)
      .map(decorate);
  }

  completeStep(id: Id): void {
    this.state.completed[id] = true;
    this.bump();
    this.commit();
  }

  cancelStep(id: Id): void {
    this.state.closed[id] = true;
    this.bump();
    this.commit();
  }

  declineStep(id: Id): void {
    this.state.closed[id] = true;
    this.bump();
    this.commit();
  }

  // --- doctor -------------------------------------------------------------

  summaryCards(): SummaryCard[] {
    return CARD_DEFS.map((c) => ({
      key: c.key,
      value: DRILL[c.key].rows.filter((id) => !this.isClosed(id)).length,
      label: c.label,
      color: c.color,
      soft: c.soft,
      iconPath: c.iconPath,
    }));
  }

  heroAttn(): number {
    const ids = new Set<Id>();
    [...DRILL.overdue.rows, ...DRILL.unreach.rows]
      .filter((id) => !this.isClosed(id))
      .forEach((id) => {
        const w = WORK.find((x) => x.id === id);
        if (w) ids.add(w.pid);
      });
    return ids.size;
  }

  drill(key: DrillKey): DrillView {
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
    return { title: d.title, sub: d.sub, rows };
  }

  insights(periodDays: number): Insights {
    return INSIGHTS_BY_PERIOD[periodDays] ?? INSIGHTS_BY_PERIOD[30];
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

  reset(): void {
    this.state = emptyState();
    this.commit();
  }
}
