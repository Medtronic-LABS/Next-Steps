import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-5 (batch 8b — TC-REF-003).
//
// No closure mechanism exists for a `Referral` anywhere in packages/core —
// `raiseReferral` only ever appends to `state.referrals`
// (packages/core/src/inMemoryEngine.ts), and there is no `closeReferral` or
// any other method that records who closed a referral or how. This test
// reaches a hypothesized `closeReferral(referralId, context)` through
// optional chaining on a cast engine, so the call resolves to `undefined`
// and never throws. The assertions below compare the real, already-raised
// referral's expected shape against that `undefined` result — genuine
// runtime mismatches, not import- or construction-time failures, and
// nothing here is wrapped in try/catch.

type ClosedReferral = {
  closedByRole?: string;
  attribution?: 'FACILITY_CONFIRMED' | 'REPORTED';
};

type EngineWithClosure = InMemoryCoordinationEngine & {
  closeReferral?(referralId: Id, context: RoleContext): Promise<ClosedReferral>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const phcContext: RoleContext = { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' };

describe('TC-REF-003 — facility closure is recorded as confirmed (EXPECTED FAIL)', () => {
  it('closing a referral at the expecting facility records closedByRole PHC_SN and attribution FACILITY_CONFIRMED', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithClosure;
    const patient = await engine.createPatient({
      name: 'Facility Closure Patient',
      mobile: '+919800003001',
      gender: 'Female',
      age: 31,
      cid: 'Facility Closure Patient',
      consent: true,
    });

    const referral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );

    const closed = await engine.closeReferral?.(referral.id, phcContext);

    expect(
      closed?.closedByRole,
      'NS-5: closing at the expecting facility must record closedByRole PHC_SN — no closure mechanism exists',
    ).toBe('PHC_SN');
    expect(
      closed?.attribution,
      'NS-5: a closure by the expecting facility must be attributed FACILITY_CONFIRMED — no closure mechanism exists',
    ).toBe('FACILITY_CONFIRMED');
  });
});
