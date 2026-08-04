import { describe, expect, it } from 'vitest';
import { mapNextStepToFhirTask } from '../src/logic';
import type { FhirTask } from '../src/logic';
import type { IdentityConfig } from '../src/identity';
import type { Id, Patient, WorkStep } from '../src/types';

// Verified cce-collector-service contract (ITEM-5-TEST-CASES.md TC-CE-001).
// The collector rejects a malformed envelope with 400 before it looks at the
// payload, and CloudEvents context attribute names are lowercase by spec —
// camelCase (`dataContentType`, `specVersion`) is the most likely mistake and
// the least obvious, since it still "looks right" to a reader. No
// CloudEvents envelope builder exists on `../src/logic` yet, so a static
// import would bind `undefined` rather than fail at collection time (the
// module itself exists — `mapNextStepToFhirTask` is already implemented
// there). Importing dynamically and calling through optional chaining defers
// the failure to the named assertions below (same technique as
// TC-FHIR-001 through TC-FHIR-007).
interface CloudEvent {
  specversion: string;
  id: string;
  source: string;
  type: string;
  subject: string;
  datacontenttype: string;
  correlationid: string;
  data: unknown;
}

type BuildCloudEvent = (task: FhirTask) => CloudEvent;

const CONFIGURED_UPID_SYSTEM = 'http://rssdi.example.org/identifier/upid';

function fixturePatient(): Patient {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Envelope Attributes Patient',
    mobile: '+919000011501',
    gender: 'Female',
    age: 45,
    cid: 'TC-CE-001',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier: [
      { system: 'http://next-steps.local/identifier/patient', value: 'local-ce-001' },
      { system: CONFIGURED_UPID_SYSTEM, value: 'upid-ce-001' },
    ],
  };
}

function fixtureStep(id: Id, pid: Id): WorkStep {
  return {
    id,
    pid,
    visitId: 'v-ce-001',
    name: 'Fixture step',
    cat: 'LAB_INVESTIGATION',
    detail: '',
    dueDate: new Date('2026-08-01T00:00:00.000Z'),
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    status: 'CREATED',
  };
}

describe('TC-CE-001 — envelope carries every required attribute (EXPECTED FAIL)', () => {
  it('has specversion 1.0, non-blank id/source/type/subject/datacontenttype/data, id <= 50 chars, and lowercase attribute names', async () => {
    const patient = fixturePatient();
    const config: IdentityConfig = { patientIdentifierSystem: CONFIGURED_UPID_SYSTEM };
    const step = fixtureStep('s-ce-001', patient.id);
    const task = mapNextStepToFhirTask(step, patient, config);

    let buildCloudEvent: BuildCloudEvent | undefined;
    try {
      ({ buildCloudEvent } = (await import('../src/logic')) as unknown as { buildCloudEvent: BuildCloudEvent });
    } catch {
      buildCloudEvent = undefined;
    }

    const envelope = buildCloudEvent?.(task);

    expect(envelope?.specversion, 'specversion must be "1.0"').toBe('1.0');
    expect(envelope?.id, 'id must be present and non-blank').toBeTruthy();
    expect((envelope?.id ?? '').length, 'id must be at most 50 characters').toBeLessThanOrEqual(50);
    expect(envelope?.source, 'source must be present and non-blank').toBeTruthy();
    expect(envelope?.type, 'type must be present and non-blank').toBeTruthy();
    expect(envelope?.subject, 'subject must be present and non-blank').toBeTruthy();
    expect(envelope?.datacontenttype, 'datacontenttype must be present and non-blank').toBeTruthy();
    expect(envelope?.datacontenttype, 'datacontenttype must be exactly "application/fhir+json"').toBe(
      'application/fhir+json',
    );
    expect(envelope?.data, 'data must be present').toBeTruthy();

    // The collector's 400 on a malformed envelope is keyed off exact,
    // lowercase CloudEvents attribute names — camelCase is a distinct, wrong
    // key, not a case-insensitive match on the right one.
    const hasOwn = (key: string) => Boolean(envelope && Object.prototype.hasOwnProperty.call(envelope, key));

    expect(hasOwn('datacontenttype'), 'attribute must be lowercase "datacontenttype"').toBe(true);
    expect(hasOwn('dataContentType'), 'must not use camelCase "dataContentType"').toBe(false);

    expect(hasOwn('specversion'), 'attribute must be lowercase "specversion"').toBe(true);
    expect(hasOwn('specVersion'), 'must not use camelCase "specVersion"').toBe(false);

    expect(hasOwn('correlationid'), 'attribute must be lowercase "correlationid"').toBe(true);
    expect(hasOwn('correlationId'), 'must not use camelCase "correlationId"').toBe(false);
  });
});
