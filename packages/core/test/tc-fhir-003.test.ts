import { describe, expect, it } from 'vitest';
import type { Id, Patient, WorkStep } from '../src/types';

// PRD §17 (ITEM-5-TEST-CASES.md TC-FHIR-003). Several date fields on Task
// look plausible for "when this is due" — `authoredOn`, `lastModified`,
// `executionPeriod` all exist on the real R4 resource. `restriction.period.end`
// is the one that actually means "must be done by"; the others mean
// creation time, last-touched time, and actual work window respectively. No
// `mapNextStepToFhirTask` exists on `../src/logic` yet, so a static import
// would bind `undefined` rather than fail at collection time (the module
// itself exists). Importing dynamically and calling through optional
// chaining defers the failure to the named assertions below (same technique
// as TC-ID-003 through TC-ID-005).
interface FhirTask {
  resourceType: 'Task';
  restriction?: { period?: { end?: string } };
  authoredOn?: string;
  lastModified?: string;
  executionPeriod?: { start?: string; end?: string };
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

const DUE_DATE = new Date('2026-07-26T00:00:00.000Z');

function fixturePatient(): Patient {
  return {
    id: 'p-fhir-003',
    name: 'Due Date Patient',
    mobile: '+919000011003',
    gender: 'Female',
    age: 38,
    cid: 'TC-FHIR-003',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: 'http://next-steps.local/identifier/patient', value: 'p-fhir-003' }],
  };
}

function fixtureStep(id: Id): WorkStep {
  return {
    id,
    pid: 'p-fhir-003',
    visitId: 'v-fhir-003',
    name: 'Fixture step',
    cat: 'LAB_INVESTIGATION',
    detail: '',
    dueDate: DUE_DATE,
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'SCHEDULED',
  };
}

describe('TC-FHIR-003 — due date maps to the restriction period (EXPECTED FAIL)', () => {
  it('places the ISO-8601 due date in restriction.period.end, not authoredOn/lastModified/executionPeriod', async () => {
    const patient = fixturePatient();
    const step = fixtureStep('s-due');
    const expectedIso = DUE_DATE.toISOString();

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const task = mapNextStepToFhirTask?.(step, patient);

    expect(task?.restriction?.period?.end, 'restriction.period.end must carry the ISO-8601 due date').toBe(
      expectedIso,
    );
    expect(task?.authoredOn, 'due date must not be placed in authoredOn').not.toBe(expectedIso);
    expect(task?.lastModified, 'due date must not be placed in lastModified').not.toBe(expectedIso);
    expect(task?.executionPeriod?.end, 'due date must not be placed in executionPeriod').not.toBe(expectedIso);
  });
});
