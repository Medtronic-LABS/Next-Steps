import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-5 (batch 8b — TC-REF-004).
//
// No closure mechanism, and consequently no closure-attribution aggregate,
// exists anywhere in packages/core. This test raises two referrals expected
// at the same PHC and hypothesizes closing one by the expecting facility and
// the other by the ANM on the basis of tracking, through optional chaining
// on a cast engine — both calls resolve to `undefined` and never throw. It
// then hypothesizes an aggregate `referralClosureSummary()` and asserts the
// two attributions are reported as separate counts, not merged into one —
// per NS-5's guardrail that FACILITY_CONFIRMED and REPORTED must never be
// merged in a metric without the split being available. Every comparison
// below is against a real referral or a real (if undefined) call result —
// none of this throws or is caught.

type ClosedReferral = {
  closedByRole?: string;
  attribution?: 'FACILITY_CONFIRMED' | 'REPORTED';
};

type ClosureSummary = {
  facilityConfirmed?: number;
  reported?: number;
};

type EngineWithClosure = InMemoryCoordinationEngine & {
  closeReferral?(referralId: Id, context: RoleContext): Promise<ClosedReferral>;
  referralClosureSummary?(context: RoleContext): Promise<ClosureSummary>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const phcContext: RoleContext = { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' };

describe('TC-REF-004 — ANM or ASHA closure is recorded as reported (EXPECTED FAIL)', () => {
  it('an ANM closure on the basis of tracking is accepted, attributed REPORTED, and kept distinct from a facility closure in the aggregate', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithClosure;

    const confirmedPatient = await engine.createPatient({
      name: 'Facility Confirmed Patient',
      mobile: '+919800004001',
      gender: 'Female',
      age: 27,
      cid: 'Facility Confirmed Patient',
      consent: true,
    });
    const reportedPatient = await engine.createPatient({
      name: 'Reported Closure Patient',
      mobile: '+919800004002',
      gender: 'Female',
      age: 33,
      cid: 'Reported Closure Patient',
      consent: true,
    });

    const confirmedReferral = await engine.raiseReferral(
      confirmedPatient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );
    const reportedReferral = await engine.raiseReferral(
      reportedPatient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );

    // One closed by the facility, one closed by the ANM on the basis of
    // tracking — not by the PHC (NS-5's Given for TC-REF-004).
    await engine.closeReferral?.(confirmedReferral.id, phcContext);
    const reportedClosure = await engine.closeReferral?.(reportedReferral.id, anmContext);

    expect(
      reportedClosure,
      'NS-5: an ANM closure on the basis of tracking must be accepted — no closure mechanism exists to accept it',
    ).toBeDefined();
    expect(
      reportedClosure?.closedByRole,
      'NS-5: the closure must record closedByRole ANM_CHO',
    ).toBe('ANM_CHO');
    expect(
      reportedClosure?.attribution,
      'NS-5: a closure by the ANM on the basis of tracking must be attributed REPORTED, not FACILITY_CONFIRMED',
    ).toBe('REPORTED');

    // The distinction must be available in an aggregate, not merely present
    // as a field on one closure record.
    const summary = await engine.referralClosureSummary?.(phcContext);

    expect(
      summary?.facilityConfirmed,
      'NS-5: the aggregate must report the facility-confirmed closure separately — one referral was closed by the facility',
    ).toBe(1);
    expect(
      summary?.reported,
      'NS-5: the aggregate must report the reported closure separately from facilityConfirmed, not merged into one count',
    ).toBe(1);
  });
});
