import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import * as core from '../src/index';
import type { CoordinationEngine } from '../src/engine';
import type { Id } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-2 (batch 8a — TC-ROLE-003).
//
// No `Facility` concept, no configured facility list, and no method to
// raise a referral exist anywhere in packages/core — `recordVisit`'s
// `CaptureInput` has no destination or direction field at all. This test
// hypothesizes NS-2's documented shape — a `FACILITIES` list exported from
// the module and a `raiseReferral(patientId, input, context)` method — and
// reaches both through optional chaining on casts, so every call resolves
// to `undefined` (or, for the reject-path assertions, a promise wrapped so
// it fulfills with `undefined` rather than rejecting) and nothing here
// throws at import or construction time. The assertions are genuine
// runtime comparisons and `.rejects` checks against the documented
// behaviour, not a try/catch hiding a thrown error.

type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

interface Facility {
  id: Id;
  name: string;
  tier: string;
  isReferralDestination: boolean;
}

interface RaisedReferral {
  id: Id;
  expectedAtFacilityId: Id;
  direction: 'UPWARD' | 'DOWNWARD';
}

type EngineWithReferral = CoordinationEngine & {
  raiseReferral?(
    patientId: Id,
    input: { expectedAtFacilityId: Id; direction: 'UPWARD' | 'DOWNWARD' },
    context: RoleContext,
  ): Promise<RaisedReferral>;
};

type CoreModule = { FACILITIES?: Facility[] };

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

describe('TC-ROLE-003 — referral destinations come from configured facilities (EXPECTED FAIL)', () => {
  it('exposes the NS-2 demo seed facility list', () => {
    const facilities = (core as unknown as CoreModule).FACILITIES;

    expect(
      facilities?.map((f) => f.name),
      'NS-2: the demo seed must configure Rampur SHC-AAM, Rampur PHC, Kotwali PHC, and District Hospital',
    ).toEqual(expect.arrayContaining(['Rampur SHC-AAM', 'Rampur PHC', 'Kotwali PHC', 'District Hospital']));
  });

  it('resolves a referral to a configured facility id', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithReferral;
    const patient = await engine.createPatient({
      name: 'Referred Patient',
      mobile: '+919800000002',
      gender: 'Female',
      age: 28,
      cid: 'Referred Patient',
      consent: true,
    });

    const referral = await engine.raiseReferral?.(
      patient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );

    expect(
      referral?.expectedAtFacilityId,
      'NS-2: a referral to a configured facility must resolve expectedAtFacilityId to that facility',
    ).toBe('FAC-PHC-RAMPUR');
  });

  it('rejects a destination that is not a configured facility', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithReferral;
    const patient = await engine.createPatient({
      name: 'Referred Patient Two',
      mobile: '+919800000003',
      gender: 'Female',
      age: 30,
      cid: 'Referred Patient Two',
      consent: true,
    });

    await expect(
      Promise.resolve(
        engine.raiseReferral?.(patient.id, { expectedAtFacilityId: 'FAC-NOT-CONFIGURED', direction: 'UPWARD' }, anmContext),
      ),
      'NS-2: a facility id absent from the configured list must be rejected, not silently accepted',
    ).rejects.toThrow();
  });

  it('rejects a free-text destination', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithReferral;
    const patient = await engine.createPatient({
      name: 'Referred Patient Three',
      mobile: '+919800000004',
      gender: 'Female',
      age: 32,
      cid: 'Referred Patient Three',
      consent: true,
    });

    await expect(
      Promise.resolve(
        engine.raiseReferral?.(patient.id, { expectedAtFacilityId: 'General Hospital Downtown', direction: 'UPWARD' }, anmContext),
      ),
      'NS-2: free text is not a resolvable facility identifier and must be rejected',
    ).rejects.toThrow();
  });
});
