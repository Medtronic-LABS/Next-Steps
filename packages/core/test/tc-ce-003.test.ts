import { describe, expect, it } from 'vitest';
import { mapNextStepToFhirTask } from '../src/logic';
import type { FhirTask } from '../src/logic';
import type { Category, Id, Patient, WorkStep } from '../src/types';

// Verified cce-collector-service contract (ITEM-5-TEST-CASES.md TC-CE-003).
// Batching the three steps from one visit into a single Bundle is the
// obvious optimisation, but the collector has no Bundle handling — its
// patient-reference extraction assumes exactly one raw FHIR resource in
// `data` and fails outright on anything else. No CloudEvents envelope
// builder exists on `../src/logic` yet, so a static import would bind
// `undefined` rather than fail at collection time (the module itself
// exists — `mapNextStepToFhirTask` is already implemented there). Importing
// dynamically and calling through optional chaining defers the failure to
// the named assertions below (same technique as TC-FHIR-001 through
// TC-FHIR-007).
interface CloudEvent {
  data: unknown;
}

type BuildCloudEvent = (task: FhirTask) => CloudEvent;

function fixturePatient(): Patient {
  return {
    id: 'p-ce-003',
    name: 'Three Steps One Visit Patient',
    mobile: '+919000011503',
    gender: 'Other',
    age: 52,
    cid: 'TC-CE-003',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [{ system: 'http://next-steps.local/identifier/patient', value: 'p-ce-003' }],
  };
}

function fixtureStep(id: Id, pid: Id, visitId: Id, cat: Category): WorkStep {
  return {
    id,
    pid,
    visitId,
    name: `Fixture step ${id}`,
    cat,
    detail: '',
    dueDate: new Date('2026-08-10T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'CREATED',
  };
}

describe('TC-CE-003 — data is a single resource, never a Bundle (EXPECTED FAIL)', () => {
  it('produces three separate envelopes for three steps in one visit, each carrying a single Task as data', async () => {
    const patient = fixturePatient();
    const visitId = 'v-ce-003';
    const steps = [
      fixtureStep('s-ce-003-a', patient.id, visitId, 'FOLLOW_UP_VISIT'),
      fixtureStep('s-ce-003-b', patient.id, visitId, 'LAB_INVESTIGATION'),
      fixtureStep('s-ce-003-c', patient.id, visitId, 'SPECIALIST_REFERRAL'),
    ];
    // Full pipeline: each step of the visit mapped to its own Task first,
    // exactly as three independent lifecycle transitions would be.
    const tasks = steps.map((step) => mapNextStepToFhirTask(step, patient));
    expect(new Set(tasks.map((t) => t.identifier[0]?.value)).size, 'sanity: fixture must map to three distinct Tasks').toBe(3);

    let buildCloudEvent: BuildCloudEvent | undefined;
    try {
      ({ buildCloudEvent } = (await import('../src/logic')) as unknown as { buildCloudEvent: BuildCloudEvent });
    } catch {
      buildCloudEvent = undefined;
    }

    const envelopes = tasks.map((task) => buildCloudEvent?.(task));

    expect(envelopes, 'three steps must produce three envelopes, one per step — never batched into one').toHaveLength(3);

    envelopes.forEach((envelope, i) => {
      const data = envelope?.data as { resourceType?: string } | undefined;
      expect(Array.isArray(envelope?.data), `envelope ${i}'s data must not be an array of resources`).toBe(false);
      expect(data?.resourceType, `envelope ${i}'s data.resourceType must be "Task"`).toBe('Task');
      expect(data?.resourceType, `envelope ${i}'s data must never be a Bundle`).not.toBe('Bundle');
    });

    const identifierValues = envelopes.map(
      (envelope) => (envelope?.data as FhirTask | undefined)?.identifier?.[0]?.value,
    );
    expect(
      new Set(identifierValues).size,
      'each envelope must wrap a distinct step\'s Task, not the same one repeated three times',
    ).toBe(3);
  });
});
