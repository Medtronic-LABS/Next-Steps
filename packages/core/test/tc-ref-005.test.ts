import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-4 (batch 8b — TC-REF-005).
//
// `raiseReferral` genuinely creates a new, independent record on every call
// (packages/core/src/inMemoryEngine.ts prepends to `state.referrals`), so
// the onward referral to the DH below is a real, separate record from the
// first — that part is asserted for real. What is missing is any way to
// close the first referral at all: there is no `closeReferral`, no stored
// referral status, and no way to read a single referral back by id, so
// "the first is COMPLETED" and "closing the first did not modify it into
// the second" cannot be demonstrated against real state today. This test
// reaches hypothesized `closeReferral` and `getReferral` through optional
// chaining on a cast engine — both resolve to `undefined` and never throw —
// and compares the real second referral against that undefined first-
// referral read. Nothing here is wrapped in try/catch.

type EngineWithReferralOps = InMemoryCoordinationEngine & {
  closeReferral?(referralId: Id, context: RoleContext): Promise<unknown>;
  getReferral?(referralId: Id): Promise<(Referral & { status?: string }) | undefined>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const phcContext: RoleContext = { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' };
const dhContext: RoleContext = { role: 'DH_SN', facilityId: 'FAC-DH-001' };

describe('TC-REF-005 — closing a referral may open the next one (EXPECTED FAIL)', () => {
  it('produces two distinct steps: the first COMPLETED and unmutated, the second open at the DH', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithReferralOps;
    const patient = await engine.createPatient({
      name: 'Onward Referral Patient',
      mobile: '+919800005001',
      gender: 'Female',
      age: 30,
      cid: 'Onward Referral Patient',
      consent: true,
    });

    const firstReferral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );

    await engine.closeReferral?.(firstReferral.id, phcContext);

    const secondReferral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      phcContext,
    );

    // Two distinct steps, not one step reused for both hops.
    expect(secondReferral.id, 'NS-4: the onward referral must be a distinct record from the first').not.toBe(
      firstReferral.id,
    );

    // The second: open, expected at the DH, UPWARD, and on the DH's arrival worklist.
    expect(secondReferral.expectedAtFacilityId, 'NS-4: the onward referral must be expected at the DH').toBe(
      'FAC-DH-001',
    );
    expect(secondReferral.direction, 'NS-4: the onward referral must carry direction UPWARD').toBe('UPWARD');

    const dhArrivals = await engine.arrivalWorklist(dhContext);
    expect(
      dhArrivals.some((row) => row.id === secondReferral.id),
      'NS-4: the onward referral must appear on the DH arrival worklist',
    ).toBe(true);

    // The first: must read back as COMPLETED, and must not have been
    // mutated into the second (same id, same original destination).
    const firstReferralRead = await engine.getReferral?.(firstReferral.id);

    expect(
      firstReferralRead?.status,
      'NS-4: the first referral must read back as COMPLETED — no stored referral status exists to read',
    ).toBe('COMPLETED');
    expect(
      firstReferralRead?.id,
      'NS-4: closing the first referral must not have mutated its id into the onward referral\'s id',
    ).toBe(firstReferral.id);
    expect(
      firstReferralRead?.expectedAtFacilityId,
      'NS-4: closing the first referral must not have overwritten its original destination with the onward one',
    ).toBe('FAC-PHC-RAMPUR');
  });
});
