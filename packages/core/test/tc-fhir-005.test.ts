import { describe, expect, it } from 'vitest';
import type { Id, Patient, WorkStep } from '../src/types';

// PRD §17 (ITEM-5-TEST-CASES.md TC-FHIR-005). Without Task.encounter the CCE
// cannot group the several steps arising from one consultation, which is
// BR-004's whole point. No `mapNextStepToFhirTask` exists on `../src/logic`
// yet, so a static import would bind `undefined` rather than fail at
// collection time (the module itself exists). Importing dynamically and
// calling through optional chaining defers the failure to the named
// assertion below (same technique as TC-ID-003 through TC-ID-005).
interface FhirTask {
  resourceType: 'Task';
  encounter?: { reference?: string };
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

function fixturePatient(): Patient {
  return {
    id: 'p-fhir-005',
    name: 'Encounter Reference Patient',
    mobile: '+919000011005',
    gender: 'Other',
    age: 29,
    cid: 'TC-FHIR-005',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: 'http://next-steps.local/identifier/patient', value: 'p-fhir-005' }],
  };
}

function fixtureStep(id: Id, visitId: Id): WorkStep {
  return {
    id,
    pid: 'p-fhir-005',
    visitId,
    name: 'Fixture step',
    cat: 'FOLLOW_UP_CALL',
    detail: '',
    dueDate: new Date('2026-07-01T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'SCHEDULED',
  };
}

describe('TC-FHIR-005 — visit maps to the encounter reference (EXPECTED FAIL)', () => {
  it('Task.encounter.reference is "Encounter/" + the step\'s visitId', async () => {
    const patient = fixturePatient();
    const visitId = 'visit-9988';
    const step = fixtureStep('s-encounter', visitId);

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const task = mapNextStepToFhirTask?.(step, patient);

    expect(task?.encounter?.reference, 'Task.encounter.reference must equal "Encounter/" + visitId').toBe(
      `Encounter/${visitId}`,
    );
  });
});
