import { describe, expect, it } from 'vitest';
import type { Patient } from '../src/types';

// PRD §17 (ITEM-5-TEST-CASES.md TC-ID-003). Every emitted event's `subject`
// flows through resolveUpid. If it reads the local identifier instead of the
// configured programme identifier, the whole commitment graph correlates on
// the wrong key — and nothing rejects it. No `../src/identity` module exists
// yet, so a static import here would fail at collection time, before any
// test runs, and the file would register zero assertions. Importing
// dynamically inside the test body instead defers that same failure to
// runtime, where it surfaces as the named assertions below (same technique
// as TC-LIFE-001's cast onto a not-yet-matching signature).
interface IdentifierEntry {
  system: string;
  value: string;
}

type ResolveUpid = (patient: Patient, config?: { patientIdentifierSystem?: string }) => string;

const LOCAL_SYSTEM = 'http://next-steps.local/identifier/patient';
// A non-default programme system URI, set via deployment configuration
// (cce.collector.fhir.patient-identifier-system per §17) rather than being
// the built-in default — this is what makes the test exercise configurability.
const CONFIGURED_UPID_SYSTEM = 'http://rssdi.example.org/identifier/upid';

function fixturePatient(identifier: IdentifierEntry[]): Patient & { identifier: IdentifierEntry[] } {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Resolve Upid Patient',
    mobile: '+919000012345',
    gender: 'Female',
    age: 33,
    cid: 'TC-ID-003',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier,
  };
}

describe('TC-ID-003 — resolveUpid returns the configured system (EXPECTED FAIL)', () => {
  it('prefers the configured-system identifier over the local one', async () => {
    const local: IdentifierEntry = { system: LOCAL_SYSTEM, value: 'local-abc' };
    const upid: IdentifierEntry = { system: CONFIGURED_UPID_SYSTEM, value: 'upid-xyz' };
    const patient = fixturePatient([local, upid]);
    const config = { patientIdentifierSystem: CONFIGURED_UPID_SYSTEM };

    let resolveUpid: ResolveUpid | undefined;
    try {
      ({ resolveUpid } = (await import('../src/identity')) as unknown as { resolveUpid: ResolveUpid });
    } catch {
      resolveUpid = undefined;
    }

    expect(resolveUpid?.(patient, config)).toBe(upid.value);
    expect(
      resolveUpid?.(patient, config),
      'must not return the local identifier when a programme one exists',
    ).not.toBe(local.value);
  });
});
