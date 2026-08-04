import { describe, expect, it } from 'vitest';
import type { Id, Patient, WorkStep } from '../src/types';

// BR-017, PRD §17 (ITEM-5-TEST-CASES.md TC-FHIR-007). FHIR Task has fields
// designed to carry clinical justification — reasonCode, reasonReference —
// and populating them because they exist would cross the boundary the
// product's regulatory position depends on. This asserts the ABSENCE of
// clinical fields, not merely the presence of coordination ones: every
// populated top-level field on the mapped Task must be coordination
// metadata (who, what category, by when, current status), and the step's
// free-text `detail` must never appear verbatim anywhere in the resource.
// No `mapNextStepToFhirTask` exists on `../src/logic` yet, so a static
// import would bind `undefined` rather than fail at collection time (the
// module itself exists). Importing dynamically and calling through
// optional chaining defers the failure to the named assertions below (same
// technique as TC-ID-003 through TC-ID-005).
interface FhirTask {
  resourceType: 'Task';
  [key: string]: unknown;
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

// Every field a coordination-only Task is allowed to populate: who (for,
// identifier), what category (code), by when (restriction), current status
// (status), plus the resource envelope itself (resourceType, id, encounter).
const ALLOWED_TASK_FIELDS = new Set([
  'resourceType',
  'id',
  'identifier',
  'status',
  'code',
  'for',
  'encounter',
  'restriction',
]);

const CLINICAL_DETAIL_TEXT = 'Suspect early diabetic retinopathy, refer for fundus exam';

function fixturePatient(): Patient {
  return {
    id: 'p-fhir-007',
    name: 'No Clinical Content Patient',
    mobile: '+919000011007',
    gender: 'Male',
    age: 62,
    cid: 'TC-FHIR-007',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: 'http://next-steps.local/identifier/patient', value: 'p-fhir-007' }],
  };
}

function fixtureStep(id: Id): WorkStep {
  return {
    id,
    pid: 'p-fhir-007',
    visitId: 'v-fhir-007',
    name: 'Fixture step',
    cat: 'SPECIALIST_REFERRAL',
    detail: CLINICAL_DETAIL_TEXT,
    dueDate: new Date('2026-07-01T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'CREATED',
  };
}

describe('TC-FHIR-007 — no clinical content in the Task (EXPECTED FAIL)', () => {
  it('carries no reasonCode, reasonReference, or other clinical-justification field', async () => {
    const patient = fixturePatient();
    const step = fixtureStep('s-clinical');

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const task = mapNextStepToFhirTask?.(step, patient);

    expect(task, 'expected a mapped Task to inspect').toBeDefined();
    expect(task && 'reasonCode' in task, 'Task must not carry reasonCode').toBe(false);
    expect(task && 'reasonReference' in task, 'Task must not carry reasonReference').toBe(false);

    const unexpectedFields = task ? Object.keys(task).filter((k) => !ALLOWED_TASK_FIELDS.has(k)) : ['<no task>'];
    expect(
      unexpectedFields,
      'every populated field must be coordination metadata (who/what-category/by-when/status) — nothing else',
    ).toEqual([]);
  });

  it('never carries the step\'s free-text clinical detail verbatim', async () => {
    const patient = fixturePatient();
    const step = fixtureStep('s-clinical-2');

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const task = mapNextStepToFhirTask?.(step, patient);

    expect(task, 'expected a mapped Task to inspect').toBeDefined();

    const serialized = JSON.stringify(task ?? null);

    expect(
      serialized.includes(CLINICAL_DETAIL_TEXT),
      'the clinical free-text detail must never travel into the FHIR Task verbatim',
    ).toBe(false);
  });
});
