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

export interface WorklistSections {
  overdue: DecoratedStep[];
  today: DecoratedStep[];
  soon: DecoratedStep[];
  unreach: DecoratedStep[];
  upcoming: DecoratedStep[];
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
  allPatients(): Patient[];
  searchPatients(query: string): Patient[];
  getPatient(id: Id): Patient | undefined;
  createPatient(input: NewPatient): Patient;

  // --- capture ---
  recordVisit(patientId: Id, steps: CaptureInput[]): void;

  // --- worklist (admin) ---
  sections(filter: Category | 'all'): WorklistSections;
  doneRows(): DoneRow[];
  openTotal(filter: Category | 'all'): number;
  openStepsForPatient(patientId: Id): DecoratedStep[];
  getStep(id: Id): WorkStep | undefined;
  completeStep(id: Id): void;
  cancelStep(id: Id): void;
  declineStep(id: Id): void;

  // --- doctor (read-only) ---
  summaryCards(): SummaryCard[];
  heroAttn(): number;
  drill(key: DrillKey): DrillView;
  insights(periodDays: number): Insights;

  // --- device sync state ---
  isOffline(): boolean;
  pending(): number;
  toggleOffline(): void;

  reset(): void;
  subscribe(listener: () => void): () => void;
}
