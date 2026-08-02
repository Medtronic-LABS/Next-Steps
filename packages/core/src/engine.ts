// The Care Coordination Engine (CCE) boundary. Both apps talk to this and
// nothing else; a real FHIR / Beckn-backed OpenPHC CCE can implement the same
// contract with no change to the app UIs (PRD §17).

import type {
  Category,
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
import type { DecoratedStep } from './logic';

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

export interface CoordinationEngine {
  // --- patients ---
  allPatients(): Promise<Patient[]>;
  searchPatients(query: string): Promise<Patient[]>;
  getPatient(id: Id): Promise<Patient | undefined>;
  createPatient(input: NewPatient): Promise<Patient>;

  // --- capture ---
  recordVisit(patientId: Id, steps: CaptureInput[], options?: VisitOptions): Promise<RecordVisitResult>;

  // --- worklist (admin) ---
  sections(filter: Category | 'all'): Promise<WorklistSections>;
  doneRows(): Promise<DoneRow[]>;
  openTotal(filter: Category | 'all'): Promise<number>;
  openStepsForPatient(patientId: Id): Promise<DecoratedStep[]>;
  getStep(id: Id): Promise<WorkStep | undefined>;
  completeStep(id: Id): Promise<void>;
  cancelStep(id: Id): Promise<void>;
  declineStep(id: Id): Promise<void>;

  // --- doctor (read-only) ---
  summaryCards(): Promise<SummaryCard[]>;
  heroAttn(): Promise<number>;
  drill(key: DrillKey): Promise<DrillView>;
  insights(periodDays: number): Promise<Insights>;

  // --- device sync state ---
  isOffline(): boolean;
  pending(): number;
  toggleOffline(): void;

  reset(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
