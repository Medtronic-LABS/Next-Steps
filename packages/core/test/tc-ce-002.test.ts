import { describe, expect, it } from 'vitest';
import { mapNextStepToFhirTask } from '../src/logic';
import type { FhirTask } from '../src/logic';
import { resolveUpid } from '../src/identity';
import type { IdentityConfig } from '../src/identity';
import type { Id, Patient, WorkStep } from '../src/types';

// Verified cce-collector-service contract (ITEM-5-TEST-CASES.md TC-CE-002).
// This is the collector's hardest validation: `subject` must equal the
// patient reference extracted from inside `data`, or the event is a hard
// 422. Building `subject` from one source (e.g. a raw patient id) and the
// reference inside `data` from another (e.g. resolveUpid through a
// differently-scoped config) is the natural way to get this wrong, so the
// expected value here is read back out of the very Task the envelope wraps —
// a step run through the full mapNextStepToFhirTask pipeline, not a
// hand-built {subject, data} pair. No CloudEvents envelope builder exists on
// `../src/logic` yet, so a static import would bind `undefined` rather than
// fail at collection time (the module itself exists — `mapNextStepToFhirTask`
// is already implemented there). Importing dynamically and calling through
// optional chaining defers the failure to the named assertions below (same
// technique as TC-FHIR-001 through TC-FHIR-007).
interface CloudEvent {
  subject: string;
  data: FhirTask;
}

type BuildCloudEvent = (task: FhirTask) => CloudEvent;

const CONFIGURED_UPID_SYSTEM = 'http://rssdi.example.org/identifier/upid';

function fixturePatient(): Patient {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Subject Match Patient',
    mobile: '+919000011502',
    gender: 'Male',
    age: 38,
    cid: 'TC-CE-002',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [
      { system: 'http://next-steps.local/identifier/patient', value: 'local-ce-002' },
      { system: CONFIGURED_UPID_SYSTEM, value: 'upid-ce-002' },
    ],
  };
}

function fixtureStep(id: Id, pid: Id): WorkStep {
  return {
    id,
    pid,
    visitId: 'v-ce-002',
    name: 'Fixture step',
    cat: 'SPECIALIST_REFERRAL',
    detail: '',
    dueDate: new Date('2026-08-05T00:00:00.000Z'),
    priority: 'HIGH',
    delivery: '—',
    attempts: 0,
    status: 'SCHEDULED',
  };
}

describe('TC-CE-002 — subject matches the patient reference inside data (EXPECTED FAIL)', () => {
  it('subject equals data.for.reference with the "Patient/" prefix stripped, for a step run through the full pipeline', async () => {
    const patient = fixturePatient();
    const config: IdentityConfig = { patientIdentifierSystem: CONFIGURED_UPID_SYSTEM };
    const step = fixtureStep('s-ce-002', patient.id);

    // Full pipeline: the same mapNextStepToFhirTask the collector's Task
    // payload is built from, not a hand-picked reference string.
    const task = mapNextStepToFhirTask(step, patient, config);
    expect(task.for.reference, 'sanity: fixture must map to "Patient/" + resolveUpid(patient)').toBe(
      `Patient/${resolveUpid(patient, config)}`,
    );

    let buildCloudEvent: BuildCloudEvent | undefined;
    try {
      ({ buildCloudEvent } = (await import('../src/logic')) as unknown as { buildCloudEvent: BuildCloudEvent });
    } catch {
      buildCloudEvent = undefined;
    }

    const envelope = buildCloudEvent?.(task);
    const expectedSubject = task.for.reference.replace(/^Patient\//, '');

    expect(
      envelope?.subject,
      'subject must equal the reference inside data with the "Patient/" prefix stripped — a mismatch is a hard 422',
    ).toBe(expectedSubject);
    expect(envelope?.data?.for?.reference, 'data must still carry the full "Patient/" reference, unstripped').toBe(
      task.for.reference,
    );
  });
});
