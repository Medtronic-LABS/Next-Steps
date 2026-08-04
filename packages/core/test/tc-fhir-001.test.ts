import { describe, expect, it } from 'vitest';
import type { Category, Id, Patient, Priority, StepStatus, WorkStep } from '../src/types';

// PRD §17 (ITEM-5-TEST-CASES.md TC-FHIR-001). The suggested mapping table
// reads "category → Task.code" but doesn't spell out the coding shape; FHIR
// Task.code is a CodeableConcept, so a bare display string is not
// interoperable — the receiving side needs a coded value (system + code) to
// route on, and no two of the five categories may collapse onto the same
// code. No `mapNextStepToFhirTask` exists on `../src/logic` yet, so a static
// import would bind `undefined` rather than fail at collection time (the
// module itself exists). Importing dynamically and calling through optional
// chaining defers the failure to the named assertions below (same technique
// as TC-ID-003 through TC-ID-005).
interface FhirCoding {
  system: string;
  code: string;
}

interface FhirTask {
  resourceType: 'Task';
  code?: { coding: FhirCoding[] };
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

const CATEGORIES: Category[] = [
  'FOLLOW_UP_VISIT',
  'LAB_INVESTIGATION',
  'SPECIALIST_REFERRAL',
  'FOLLOW_UP_CALL',
  'OTHER',
];

function fixturePatient(): Patient {
  return {
    id: 'p-fhir-001',
    name: 'Category Coding Patient',
    mobile: '+919000011001',
    gender: 'Female',
    age: 40,
    cid: 'TC-FHIR-001',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: 'http://next-steps.local/identifier/patient', value: 'p-fhir-001' }],
  };
}

function fixtureStep(id: Id, cat: Category, status: StepStatus, priority: Priority = 'NORMAL'): WorkStep {
  return {
    id,
    pid: 'p-fhir-001',
    visitId: 'v-fhir-001',
    name: 'Fixture step',
    cat,
    detail: '',
    dueDate: new Date('2026-07-01T00:00:00.000Z'),
    priority,
    delivery: '—',
    attempts: 0,
    status,
  };
}

describe('TC-FHIR-001 — category maps to Task.code (EXPECTED FAIL)', () => {
  it('gives each of the five categories a distinct coded Task.code', async () => {
    const patient = fixturePatient();

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const tasks = CATEGORIES.map((cat, i) =>
      mapNextStepToFhirTask?.(fixtureStep(`s${i}`, cat, 'CREATED'), patient),
    );

    tasks.forEach((task, i) => {
      expect(task?.code?.coding?.[0]?.system, `${CATEGORIES[i]} must carry a coding system`).toBeTruthy();
      expect(task?.code?.coding?.[0]?.code, `${CATEGORIES[i]} must carry a coding code`).toBeTruthy();
    });

    const codes = tasks.map((task) => task?.code?.coding?.[0]?.code);
    const distinctCodes = new Set(codes);
    expect(distinctCodes.size, 'no two categories may share a Task.code').toBe(CATEGORIES.length);
  });
});
