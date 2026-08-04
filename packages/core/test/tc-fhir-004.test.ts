import { describe, expect, it } from 'vitest';
import { resolveUpid } from '../src/identity';
import type { Id, Patient, WorkStep } from '../src/types';

// PRD §17, verified cce-collector-service contract (ITEM-5-TEST-CASES.md
// TC-FHIR-004). The collector strips the `Patient/` prefix off Task.for.reference
// and compares the remainder against the envelope's `subject` — any
// inconsistency between the two is a hard 422 with the event rejected. So
// this test computes the expected value through the real `resolveUpid`
// (already implemented in ../src/identity) rather than hand-picking a
// string, making the two sides' agreement load-bearing rather than
// coincidental. No `mapNextStepToFhirTask` exists on `../src/logic` yet, so
// a static import would bind `undefined` rather than fail at collection
// time (the module itself exists). Importing dynamically and calling
// through optional chaining defers the failure to the named assertions
// below (same technique as TC-ID-003 through TC-ID-005).
interface FhirTask {
  resourceType: 'Task';
  for?: { reference?: string };
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

const CONFIGURED_UPID_SYSTEM = 'http://rssdi.example.org/identifier/upid';

function fixturePatient(): Patient {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Task For Reference Patient',
    mobile: '+919000011004',
    gender: 'Male',
    age: 50,
    cid: 'TC-FHIR-004',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [
      { system: 'http://next-steps.local/identifier/patient', value: 'local-004' },
      { system: CONFIGURED_UPID_SYSTEM, value: 'upid-004-xyz' },
    ],
  };
}

function fixtureStep(id: Id, pid: Id): WorkStep {
  return {
    id,
    pid,
    visitId: 'v-fhir-004',
    name: 'Fixture step',
    cat: 'SPECIALIST_REFERRAL',
    detail: '',
    dueDate: new Date('2026-07-01T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'CREATED',
  };
}

describe('TC-FHIR-004 — Task.for references the resolved UPID (EXPECTED FAIL)', () => {
  it('Task.for.reference is exactly "Patient/" + resolveUpid(patient)', async () => {
    const patient = fixturePatient();
    const config: IdentityConfig = { patientIdentifierSystem: CONFIGURED_UPID_SYSTEM };
    const step = fixtureStep('s-for', patient.id);
    const expectedX = resolveUpid(patient, config);
    expect(expectedX, 'sanity: fixture must resolve to the programme identifier').toBe('upid-004-xyz');

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const task = mapNextStepToFhirTask?.(step, patient, config);

    expect(task?.for?.reference, 'Task.for.reference must equal "Patient/" + resolveUpid(patient)').toBe(
      `Patient/${expectedX}`,
    );
  });
});
