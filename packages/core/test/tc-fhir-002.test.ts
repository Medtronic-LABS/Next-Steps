import { describe, expect, it } from 'vitest';
import type { Id, Patient, StepStatus, WorkStep } from '../src/types';

// PRD §17, §11.2 (ITEM-5-TEST-CASES.md TC-FHIR-002). DECLINED maps to
// `rejected`, not `cancelled` — the distinction that carries the
// DECLINED/CANCELLED asymmetry from §13. Collapsing them loses the meaning
// the whole metric rests on. No `mapNextStepToFhirTask` exists on
// `../src/logic` yet, so a static import would bind `undefined` rather than
// fail at collection time (the module itself exists). Importing dynamically
// and calling through optional chaining defers the failure to the named
// assertions below (same technique as TC-ID-003 through TC-ID-005).
interface FhirTask {
  resourceType: 'Task';
  status?: string;
}

type IdentityConfig = { patientIdentifierSystem?: string };
type MapNextStepToFhirTask = (step: WorkStep, patient: Patient, config?: IdentityConfig) => FhirTask;

const EXPECTED: Record<StepStatus, string> = {
  CREATED: 'requested',
  SCHEDULED: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DECLINED: 'rejected',
};

function fixturePatient(): Patient {
  return {
    id: 'p-fhir-002',
    name: 'Status Mapping Patient',
    mobile: '+919000011002',
    gender: 'Male',
    age: 45,
    cid: 'TC-FHIR-002',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: 'http://next-steps.local/identifier/patient', value: 'p-fhir-002' }],
  };
}

function fixtureStep(id: Id, status: StepStatus): WorkStep {
  return {
    id,
    pid: 'p-fhir-002',
    visitId: 'v-fhir-002',
    name: 'Fixture step',
    cat: 'FOLLOW_UP_VISIT',
    detail: '',
    dueDate: new Date('2026-07-01T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status,
  };
}

describe('TC-FHIR-002 — status mapping covers every state (EXPECTED FAIL)', () => {
  it('maps CREATED/SCHEDULED/COMPLETED/CANCELLED/DECLINED to their FHIR TaskStatus', async () => {
    const patient = fixturePatient();

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    (Object.keys(EXPECTED) as StepStatus[]).forEach((status) => {
      const task = mapNextStepToFhirTask?.(fixtureStep(`s-${status}`, status), patient);
      expect(task?.status, `${status} must map to Task.status "${EXPECTED[status]}"`).toBe(EXPECTED[status]);
    });
  });

  it('keeps DECLINED distinct from CANCELLED — rejected, not cancelled', async () => {
    const patient = fixturePatient();

    let mapNextStepToFhirTask: MapNextStepToFhirTask | undefined;
    try {
      ({ mapNextStepToFhirTask } = (await import('../src/logic')) as unknown as {
        mapNextStepToFhirTask: MapNextStepToFhirTask;
      });
    } catch {
      mapNextStepToFhirTask = undefined;
    }

    const declined = mapNextStepToFhirTask?.(fixtureStep('s-declined', 'DECLINED'), patient);
    const cancelled = mapNextStepToFhirTask?.(fixtureStep('s-cancelled', 'CANCELLED'), patient);

    expect(declined?.status, 'DECLINED must not collapse onto cancelled').not.toBe(cancelled?.status);
    expect(declined?.status).toBe('rejected');
  });
});
