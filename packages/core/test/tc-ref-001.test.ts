import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { RaiseReferralInput } from '../src/engine';
import type { Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-4 (batch 8b — TC-REF-001).
//
// `raiseReferral` and the `Referral` type already exist (batch 8a) and do
// carry `expectedAtFacilityId` and `direction` — those two fields are real
// and this test asserts them for real, expecting them to pass. What NS-4
// additionally calls for, and what TC-REF-001 states explicitly ("It is a
// SPECIALIST_REFERRAL"), is that a referral is a step of that category —
// the existing `Category` used elsewhere for ordinary next steps. `Referral`
// (packages/core/src/types.ts) carries no `cat` field at all, so reading it
// back through that lens fails: `(referral as any).cat` is `undefined`, not
// `'SPECIALIST_REFERRAL'`. That comparison is a genuine runtime mismatch
// against a real object returned by a real call — not an import- or
// construction-time failure, and nothing here is wrapped in try/catch.

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const phcContext: RoleContext = { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' };

type ReferralWithCategory = Referral & { cat?: string };

describe('TC-REF-001 — a referral carries destination and direction (EXPECTED FAIL)', () => {
  it('an upward referral to a PHC is a SPECIALIST_REFERRAL carrying expectedAtFacilityId and direction: UPWARD', async () => {
    const engine = new InMemoryCoordinationEngine();
    const patient = await engine.createPatient({
      name: 'Upward Referral Patient',
      mobile: '+919800001001',
      gender: 'Female',
      age: 26,
      cid: 'Upward Referral Patient',
      consent: true,
    });

    const input: RaiseReferralInput = { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' };
    const referral = (await engine.raiseReferral(patient.id, input, anmContext)) as ReferralWithCategory;

    expect(referral.expectedAtFacilityId, 'NS-4: expectedAtFacilityId must resolve to the chosen destination').toBe(
      'FAC-PHC-RAMPUR',
    );
    expect(referral.direction, 'NS-4: an upward referral must carry direction UPWARD').toBe('UPWARD');
    expect(
      referral.cat,
      'NS-4: a referral is a SPECIALIST_REFERRAL step — Referral carries no `cat` field today',
    ).toBe('SPECIALIST_REFERRAL');
  });

  it('a downward referral back to a sub-centre carries direction: DOWNWARD and is also a SPECIALIST_REFERRAL', async () => {
    const engine = new InMemoryCoordinationEngine();
    const patient = await engine.createPatient({
      name: 'Downward Referral Patient',
      mobile: '+919800001002',
      gender: 'Female',
      age: 29,
      cid: 'Downward Referral Patient',
      consent: true,
    });

    const input: RaiseReferralInput = { expectedAtFacilityId: 'SHC-RAMPUR', direction: 'DOWNWARD' };
    const referral = (await engine.raiseReferral(patient.id, input, phcContext)) as ReferralWithCategory;

    expect(referral.expectedAtFacilityId, 'NS-4: a downward referral must resolve to the sub-centre').toBe(
      'SHC-RAMPUR',
    );
    expect(referral.direction, 'NS-4: a referral back to a sub-centre must carry direction DOWNWARD').toBe(
      'DOWNWARD',
    );
    expect(
      referral.cat,
      'NS-4: direction alone is not the whole shape — a downward referral is a SPECIALIST_REFERRAL too',
    ).toBe('SPECIALIST_REFERRAL');
  });
});
