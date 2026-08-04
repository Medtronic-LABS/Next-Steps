import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Patient } from '../src/types';

// PRD §10.1, §17 (ITEM-5-TEST-CASES.md TC-ID-002). A single identifier field
// makes ABHA (or any future programme id) a migration; a list makes it an
// append. Patient (types.ts) has no `identifier` field today, so a newly
// created patient carries no local identifier at all.
interface IdentifierEntry {
  system: string;
  value: string;
}

const LOCAL_SYSTEM = 'http://next-steps.local/identifier/patient';
const UPID_SYSTEM = 'http://openphc.org/identifier/upid';

describe('TC-ID-002 — identifiers are a list with system URIs (EXPECTED FAIL)', () => {
  it('holds a local and a programme identifier as {system, value} entries; adding the second leaves the first untouched', async () => {
    const engine = new InMemoryCoordinationEngine();

    const created = await engine.createPatient({
      name: 'Identifier List Patient',
      mobile: '90000 12345',
      gender: 'Female',
      age: 40,
      cid: 'TC-ID-002',
      consent: true,
    });

    const patient = created as Patient & { identifier: IdentifierEntry[] };

    expect(Array.isArray(patient.identifier), 'a newly created patient must carry an identifier list').toBe(
      true,
    );

    const localBefore = patient.identifier.find((entry) => entry.system === LOCAL_SYSTEM);
    expect(localBefore, 'expected a local identifier entry to exist').toBeDefined();
    expect(typeof localBefore?.value).toBe('string');

    const programmeIdentifier: IdentifierEntry = { system: UPID_SYSTEM, value: 'upid-example-001' };
    const withProgramme: Patient & { identifier: IdentifierEntry[] } = {
      ...patient,
      identifier: [...patient.identifier, programmeIdentifier],
    };

    expect(withProgramme.identifier, 'adding a second identifier must not drop the first').toHaveLength(
      patient.identifier.length + 1,
    );
    expect(
      withProgramme.identifier.find((entry) => entry.system === LOCAL_SYSTEM),
      'the local entry must be unaltered',
    ).toEqual(localBefore);
    expect(withProgramme.identifier).toContainEqual(programmeIdentifier);
    expect(
      patient.identifier,
      'the original identifier list must remain unaffected by building a new one',
    ).not.toContainEqual(programmeIdentifier);
  });
});
