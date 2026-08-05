import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-6 (batch 8b — TC-REF-006).
//
// No completion location is ever recorded for a `Referral` — there is no
// closure mechanism at all (see TC-REF-003/004/005), so there is nowhere
// for `REFERRED_PUBLIC_FACILITY` / `OTHER_PUBLIC_FACILITY` / `PRIVATE_FACILITY`
// to be captured, and no aggregate reports referral resolution as a total
// with a public/private split. This test raises three referrals and
// hypothesizes closing each with a distinct completion location, and a
// `referralResolutionSummary()` aggregate, all through optional chaining on
// a cast engine — every hypothesized call resolves to `undefined` and never
// throws. The assertions compare the documented total/public/private split
// against that undefined summary — genuine runtime mismatches, not import-
// or construction-time failures, and nothing here is wrapped in try/catch.

type ClosureInput = {
  completionLocation: 'REFERRED_PUBLIC_FACILITY' | 'OTHER_PUBLIC_FACILITY' | 'PRIVATE_FACILITY';
};

type ResolutionSummary = {
  total?: number;
  public?: number;
  private?: number;
};

type EngineWithResolution = InMemoryCoordinationEngine & {
  closeReferral?(referralId: Id, context: RoleContext, input: ClosureInput): Promise<unknown>;
  referralResolutionSummary?(context: RoleContext): Promise<ResolutionSummary>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const dhContext: RoleContext = { role: 'DH_SN', facilityId: 'FAC-DH-001' };

describe('TC-REF-006 — completion location is recorded (EXPECTED FAIL)', () => {
  it('reports a total with the public and private figures available separately, with private counted as resolved', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithResolution;

    const referredPublicPatient = await engine.createPatient({
      name: 'Referred Public Patient',
      mobile: '+919800006001',
      gender: 'Female',
      age: 22,
      cid: 'Referred Public Patient',
      consent: true,
    });
    const otherPublicPatient = await engine.createPatient({
      name: 'Other Public Patient',
      mobile: '+919800006002',
      gender: 'Female',
      age: 25,
      cid: 'Other Public Patient',
      consent: true,
    });
    const privatePatient = await engine.createPatient({
      name: 'Private Facility Patient',
      mobile: '+919800006003',
      gender: 'Female',
      age: 28,
      cid: 'Private Facility Patient',
      consent: true,
    });

    const referredPublicReferral = await engine.raiseReferral(
      referredPublicPatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );
    const otherPublicReferral = await engine.raiseReferral(
      otherPublicPatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );
    const privateReferral = await engine.raiseReferral(
      privatePatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    await engine.closeReferral?.(referredPublicReferral.id, dhContext, {
      completionLocation: 'REFERRED_PUBLIC_FACILITY',
    });
    await engine.closeReferral?.(otherPublicReferral.id, anmContext, {
      completionLocation: 'OTHER_PUBLIC_FACILITY',
    });
    await engine.closeReferral?.(privateReferral.id, anmContext, {
      completionLocation: 'PRIVATE_FACILITY',
    });

    const summary = await engine.referralResolutionSummary?.(dhContext);

    expect(
      summary?.total,
      'NS-6: referral resolution must report a total across all completion locations — no such aggregate exists',
    ).toBe(3);
    expect(
      summary?.public,
      'NS-6: the public figure (referred + other public facility) must be available separately — no such aggregate exists',
    ).toBe(2);
    expect(
      summary?.private,
      'NS-6: private care must count as resolved and be reported separately, not folded into a failure count — no such aggregate exists',
    ).toBe(1);
  });
});
