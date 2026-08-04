import { describe, expect, it } from 'vitest';
import { DEFAULT_UPID_SYSTEM, LOCAL_IDENTIFIER_SYSTEM } from '../src/identity';
import type { Id, Patient, WorkStep } from '../src/types';

// PRD §17 (ITEM-5-TEST-CASES.md TC-FHIR-006). §17 requires app UUIDs to
// travel as identifiers so a returning event can be correlated back to the
// originating step; without it, receive is impossible later. The test case
// only specifies "a Next Steps system URI", not a fixed string, so this
// asserts the shape the collector needs — a present, non-blank system
// distinct from the patient-identifier systems (../src/identity) — rather
// than pinning an exact URI the implementation hasn't chosen yet. No
// `mapNextStepToFhirTask` exists on `../src/logic` yet, so a static import
// would bind `undefined` rather than fail at collection time (the module
// itself exists). Importing dynamically and calling through optional
// chaining defers the failure to the named assertions below (same technique
// as TC-ID-003 through TC-ID-005).
interface FhirIdentifier {
  system: string;
  value: string;
}

interface FhirTask {
  resourceType: 'Task';
  identifier?: FhirIdentifier[];
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

function fixturePatient(): Patient {
  return {
    id: 'p-fhir-006',
    name: 'Step Identifier Patient',
    mobile: '+919000011006',
    gender: 'Female',
    age: 55,
    cid: 'TC-FHIR-006',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: 'p-fhir-006' }],
  };
}

function fixtureStep(id: Id): WorkStep {
  return {
    id,
    pid: 'p-fhir-006',
    visitId: 'v-fhir-006',
    name: 'Fixture step',
    cat: 'OTHER',
    detail: '',
    dueDate: new Date('2026-07-01T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'CREATED',
  };
}

describe('TC-FHIR-006 — app identifiers travel with the resource (EXPECTED FAIL)', () => {
  it('Task.identifier[] carries the internal step id under a Next Steps system URI', async () => {
    const patient = fixturePatient();
    const stepId = 'internal-step-6001';
    const step = fixtureStep(stepId);

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const task = mapNextStepToFhirTask?.(step, patient);
    const entry = task?.identifier?.find((i) => i.value === stepId);

    expect(entry, 'expected an identifier entry carrying the internal step id').toBeDefined();
    expect(entry?.system, 'the step identifier must carry a non-blank system URI').toBeTruthy();
    expect(
      entry?.system,
      'the step identifier system must be distinct from the patient UPID system — this is a Next Steps system, not a patient one',
    ).not.toBe(DEFAULT_UPID_SYSTEM);
    expect(
      entry?.system,
      'the step identifier system must be distinct from the local patient identifier system',
    ).not.toBe(LOCAL_IDENTIFIER_SYSTEM);
  });
});
