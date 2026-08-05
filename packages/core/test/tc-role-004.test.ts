import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { NewPatient } from '../src/engine';
import type { Id, Identifier } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-3 (batch 8a — TC-ROLE-004).
//
// `NewPatient` (packages/core/src/engine.ts) carries no `villageName`,
// `ashaName`, or `registeredAtFacilityId`, and `createPatient`
// (packages/core/src/inMemoryEngine.ts) copies only name/mobile/gender/
// age/cid/consent onto the stored Patient — any extra field on the input
// is silently dropped, and the only identifier ever attached is the local
// system one. This test builds a registration input carrying NS-3's
// documented additions and reads the patient back; every assertion below
// is a genuine runtime comparison against what was actually persisted, not
// an import- or construction-time failure.

type NewPatientWithRegistration = NewPatient & {
  villageName?: string;
  ashaName?: string;
  registeredAtFacilityId?: Id;
  identifiers?: Identifier[];
};

type PatientWithRegistration = {
  id: Id;
  villageName?: string;
  ashaName?: string;
  registeredAtFacilityId?: Id;
  identifier: Identifier[];
};

describe('TC-ROLE-004 — registration captures village and ASHA link (EXPECTED FAIL)', () => {
  it('persists villageName, ashaName, registeredAtFacilityId, and an ABHA/RCH identifier', async () => {
    const engine = new InMemoryCoordinationEngine();
    const input: NewPatientWithRegistration = {
      name: 'Registered Patient',
      mobile: '+919800000005',
      gender: 'Female',
      age: 23,
      cid: 'Registered Patient',
      consent: true,
      villageName: 'Rampur',
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
      identifiers: [{ system: 'https://healthid.ndhm.gov.in', value: '12-3456-7890-1234' }],
    };

    const created = await engine.createPatient(input);
    const read = (await engine.getPatient(created.id)) as unknown as PatientWithRegistration | undefined;

    expect(read?.villageName, 'NS-3: villageName must be persisted on registration').toBe('Rampur');
    expect(read?.ashaName, 'NS-3: ashaName must be persisted on registration').toBe('Asha One');
    expect(
      read?.registeredAtFacilityId,
      'NS-3: registeredAtFacilityId must be set implicitly at registration, and is what scope resolves against, not the village',
    ).toBe('SHC-RAMPUR');

    const hasAbhaOrRchIdentifier = read?.identifier.some((i) => i.value === '12-3456-7890-1234');
    expect(
      hasAbhaOrRchIdentifier,
      "NS-3, item 5a: the ABHA or RCH identifier supplied at registration must appear in the patient's identifier list, not just the local system one",
    ).toBe(true);
  });
});
