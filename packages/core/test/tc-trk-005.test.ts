import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ProgrammeProfile } from '../src/profile';
import type { Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-9 (batch 8c — TC-TRK-005).
//
// `AT_RISK_OF_DROP_OUT` and `LOST_TO_FOLLOW` are real, named values of the
// real `WorklistFilter` type, and `worklist()` is a real, already-shipped
// method — but its `switch` has no case for either yet (packages/core/src/
// inMemoryEngine.ts: "PMSMA, tracking and escalation state introduced in
// batches 8b-8d... until then they truthfully answer 'none yet'"). So every
// call below is a real call to a real method; the failures are genuine
// empty-array mismatches, not thrown errors or hypothesized methods. The
// escalation count itself is still hypothesized (no such mechanism exists),
// reached through optional chaining on `getReferral`, the real method.
//
// The point of this case is specifically that both states must be *derived*
// — so the second read below is a pure read, with no intervening write, and
// must still compute the same answer as the first.

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type EscalationProfile = ProgrammeProfile & { escalationWindowDays?: number };
type TrackedReferral = Referral & { escalationCount?: number };

type EngineWithTracking = InMemoryCoordinationEngine & {
  getReferral(referralId: string): Promise<TrackedReferral | undefined>;
  recordTrackingOutcome?(
    referralId: string,
    input: { outcome: 'COULD_NOT_BE_CONTACTED' },
    context: RoleContext,
  ): Promise<TrackedReferral>;
};

const hrpProfile: EscalationProfile = { escalationWindowDays: 2 };
const WINDOW_MS = hrpProfile.escalationWindowDays! * DAY_MS;

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };

describe('TC-TRK-005 — at-risk and lost-to-follow are derived (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('at-risk stays true across a pure read with the clock advanced, and a separate patient reads as lost-to-follow', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: hrpProfile }) as EngineWithTracking;

    const atRiskPatient = await engine.createPatient({
      name: 'At Risk Patient',
      mobile: '+919800005001',
      gender: 'Female',
      age: 30,
      cid: 'At Risk Patient',
      consent: true,
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const atRiskReferral = await engine.raiseReferral(
      atRiskPatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // Given: an open referral with escalationCount 2 — two escalation
    // windows pass with no tracking action to reset the clock.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + 2 * WINDOW_MS));
    const escalatedTwice = await engine.getReferral(atRiskReferral.id);
    expect(
      escalatedTwice?.escalationCount,
      'NS-8: two escalation windows with no reset must bring escalationCount to 2 — no escalation mechanism exists',
    ).toBe(2);

    // When: it is read — AT_RISK_OF_DROP_OUT is escalationCount >= 2.
    const firstRead = await engine.worklist(anmContext, 'AT_RISK_OF_DROP_OUT');
    expect(
      firstRead.some((row) => row.id === atRiskPatient.id),
      'NS-9: an open referral with escalationCount >= 2 must read as at risk of drop out — the AT_RISK_OF_DROP_OUT filter always answers empty today',
    ).toBe(true);

    // Then: the clock advances a week with no write — the derived answer
    // must not change, and must not have been computed by writing a status
    // that a pure read then simply returns.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + 2 * WINDOW_MS + 7 * DAY_MS));
    const secondRead = await engine.worklist(anmContext, 'AT_RISK_OF_DROP_OUT');
    expect(
      secondRead.some((row) => row.id === atRiskPatient.id),
      'NS-9: at-risk must still compute true a week later with no intervening write — it is derived on read, never stored',
    ).toBe(true);

    // Separately: an open commitment whose latest tracking outcome is
    // "could not be contacted" reads as lost-to-follow.
    const lostPatient = await engine.createPatient({
      name: 'Lost To Follow Patient',
      mobile: '+919800005002',
      gender: 'Female',
      age: 34,
      cid: 'Lost To Follow Patient',
      consent: true,
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const lostReferral = await engine.raiseReferral(
      lostPatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );
    const trackingResult = await engine.recordTrackingOutcome?.(
      lostReferral.id,
      { outcome: 'COULD_NOT_BE_CONTACTED' },
      ashaContext,
    );
    expect(
      trackingResult,
      'NS-7: "could not be contacted" must be recordable — recordTrackingOutcome does not exist',
    ).toBeDefined();

    const lostToFollow = await engine.worklist(anmContext, 'LOST_TO_FOLLOW');
    expect(
      lostToFollow.some((row) => row.id === lostPatient.id),
      'NS-9: an open referral whose latest tracking outcome is "could not be contacted" must read as lost to follow — the LOST_TO_FOLLOW filter always answers empty today',
    ).toBe(true);
  });
});
