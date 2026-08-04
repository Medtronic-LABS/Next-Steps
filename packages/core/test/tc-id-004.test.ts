import { describe, expect, it } from 'vitest';
import type { Patient } from '../src/types';

// PRD §17 (ITEM-5-TEST-CASES.md TC-ID-004). Patients reach a clinic before
// their programme registration completes. Throwing here would exclude
// exactly the least-connected patients — the ones the product exists for.
// No `../src/identity` module exists yet, so a static import here would
// fail at collection time, before any test runs, and the file would
// register zero assertions. Importing dynamically inside the test body
// instead defers that same failure to runtime, where it surfaces as the
// named assertion below (same technique as TC-LIFE-001's cast onto a
// not-yet-matching signature).
interface IdentifierEntry {
  system: string;
  value: string;
}

type ResolveUpid = (patient: Patient, config?: { patientIdentifierSystem?: string }) => string;

const LOCAL_SYSTEM = 'http://next-steps.local/identifier/patient';

function fixturePatient(identifier: IdentifierEntry[]): Patient & { identifier: IdentifierEntry[] } {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Local Only Patient',
    mobile: '+919000054321',
    gender: 'Male',
    age: 61,
    cid: 'TC-ID-004',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier,
  };
}

describe('TC-ID-004 — resolveUpid falls back when no programme identifier exists (EXPECTED FAIL)', () => {
  it('returns the local identifier without throwing', async () => {
    const local: IdentifierEntry = { system: LOCAL_SYSTEM, value: 'local-only-001' };
    const patient = fixturePatient([local]);

    let resolveUpid: ResolveUpid | undefined;
    try {
      ({ resolveUpid } = (await import('../src/identity')) as unknown as { resolveUpid: ResolveUpid });
    } catch {
      resolveUpid = undefined;
    }

    expect(() => resolveUpid?.(patient)).not.toThrow();
    expect(resolveUpid?.(patient)).toBe(local.value);
  });
});
