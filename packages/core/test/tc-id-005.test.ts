import { describe, expect, it } from 'vitest';
import type { Patient } from '../src/types';

// PRD §17, verified cce-collector-service contract (ITEM-5-TEST-CASES.md
// TC-ID-005). The collector walks identifier[] for a `system` matching its
// configured URI and SILENTLY falls back to Patient.id if none matches — a
// wrong or absent system produces no error, just correlation against the
// wrong value, discovered much later. So this assertion checks the emitted
// system URI for exact equality, not mere presence, and separately guards
// against the value having silently fallen back to Patient.id. No
// `../src/identity` module exists yet, so a static import here would fail
// at collection time, before any test runs, and the file would register
// zero assertions. Importing dynamically inside the test body instead
// defers that same failure to runtime, where it surfaces as the named
// assertions below (same technique as TC-LIFE-001's cast onto a
// not-yet-matching signature).
interface IdentifierEntry {
  system: string;
  value: string;
}

type ResolveUpid = (patient: Patient, config?: { patientIdentifierSystem?: string }) => string;
type BuildFhirPatient = (
  patient: Patient,
  config?: { patientIdentifierSystem?: string },
) => { identifier: IdentifierEntry[] };

const LOCAL_SYSTEM = 'http://next-steps.local/identifier/patient';
// A deployment-specific system, deliberately not the collector's documented
// default — proves the builder reads the configured URI rather than
// hardcoding it.
const CONFIGURED_SYSTEM = 'http://rssdi-pilot.example.org/identifier/upid';

function fixturePatient(identifier: IdentifierEntry[]): Patient & { identifier: IdentifierEntry[] } {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Emitted Fhir Patient',
    mobile: '+919000099999',
    gender: 'Other',
    age: 27,
    cid: 'TC-ID-005',
    consent: true,
    last: '—',
    open: 0,
    overdue: 0,
    identifier,
  };
}

describe('TC-ID-005 — emitted Patient carries the configured system URI (EXPECTED FAIL)', () => {
  it('identifier[] carries the exact configured system, not merely a present one, and does not silently fall back to Patient.id', async () => {
    const config = { patientIdentifierSystem: CONFIGURED_SYSTEM };
    const local: IdentifierEntry = { system: LOCAL_SYSTEM, value: 'local-005' };
    const programme: IdentifierEntry = { system: CONFIGURED_SYSTEM, value: 'upid-005' };
    const patient = fixturePatient([local, programme]);

    let resolveUpid: ResolveUpid | undefined;
    let buildFhirPatient: BuildFhirPatient | undefined;
    try {
      ({ resolveUpid, buildFhirPatient } = (await import('../src/identity')) as unknown as {
        resolveUpid: ResolveUpid;
        buildFhirPatient: BuildFhirPatient;
      });
    } catch {
      resolveUpid = undefined;
      buildFhirPatient = undefined;
    }

    const fhirPatient = buildFhirPatient?.(patient, config);
    const resolved = resolveUpid?.(patient, config);

    const matching = fhirPatient?.identifier.find((entry) => entry.value === resolved);

    expect(matching, 'expected an identifier entry carrying the resolved UPID value').toBeDefined();
    expect(matching?.system, 'system must be exactly the configured URI, not merely present').toBe(
      CONFIGURED_SYSTEM,
    );
    expect(
      matching?.value,
      'must not have silently fallen back to correlating on Patient.id',
    ).not.toBe(patient.id);
  });
});
