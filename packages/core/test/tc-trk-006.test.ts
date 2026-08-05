import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ProgrammeProfile } from '../src/profile';
import type { Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-8 (batch 8c — TC-TRK-006).
//
// No escalation mechanism exists, so there is no clock to be "the same code,
// different profile value" about yet. This test does not — and cannot —
// inspect the escalation implementation for a branch on use case; instead
// it tests the observable consequence NS-8 demands of a *data-driven*
// clock: two engines, differing only in the `escalationWindowDays` value on
// their `ProgrammeProfile` (a real, existing type — the field itself is
// hypothesized, named after its existing sibling `lostToFollowUpDays`),
// given otherwise identical referrals. If escalation were hardcoded to two
// branches ("HRP" vs "newborn") rather than driven by this value, both engines
// would behave identically regardless of what is configured; asserting they
// diverge on the configured value alone is the only way to test "no branch
// on use case" from outside the implementation. `escalationCount` is
// reached through optional chaining on `getReferral`, the real,
// already-shipped method — every failure below is a clean mismatch against
// its real (currently `undefined`) return, never a thrown error.

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type EscalationProfile = ProgrammeProfile & { escalationWindowDays?: number };
type TrackedReferral = Referral & { escalationCount?: number };

type EngineWithTracking = InMemoryCoordinationEngine & {
  getReferral(referralId: string): Promise<TrackedReferral | undefined>;
};

const hrpProfile: EscalationProfile = { escalationWindowDays: 2 };
const newbornProfile: EscalationProfile = { escalationWindowDays: 1 };

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

async function raiseIdenticalReferral(engine: InMemoryCoordinationEngine) {
  const patient = await engine.createPatient({
    name: 'Profile Clock Patient',
    mobile: '+919800006001',
    gender: 'Female',
    age: 27,
    cid: 'Profile Clock Patient',
    consent: true,
    ashaName: 'Asha One',
    registeredAtFacilityId: 'SHC-RAMPUR',
  });
  return engine.raiseReferral(
    patient.id,
    { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
    anmContext,
  );
}

describe('TC-TRK-006 — the newborn clock is tighter, with the same code (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('escalates the newborn-profile referral after 1 day and the HRP-profile referral only after 2, from the profile value alone', async () => {
    const hrpEngine = new InMemoryCoordinationEngine({ profile: hrpProfile }) as EngineWithTracking;
    const newbornEngine = new InMemoryCoordinationEngine({ profile: newbornProfile }) as EngineWithTracking;

    const hrpReferral = await raiseIdenticalReferral(hrpEngine);
    const newbornReferral = await raiseIdenticalReferral(newbornEngine);

    // After one day: the newborn referral has escalated, the HRP one has not.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + DAY_MS));
    const newbornDay1 = await newbornEngine.getReferral(newbornReferral.id);
    expect(
      newbornDay1?.escalationCount,
      'NS-8: under the newborn profile (1-day window) the referral must have escalated after 1 day — no escalation mechanism exists',
    ).toBe(1);

    const hrpDay1 = await hrpEngine.getReferral(hrpReferral.id);
    expect(
      hrpDay1?.escalationCount ?? 0,
      'NS-8: under the HRP profile (2-day window) the referral must NOT have escalated after only 1 day',
    ).toBe(0);

    // After two days: both have escalated.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + 2 * DAY_MS));
    const hrpDay2 = await hrpEngine.getReferral(hrpReferral.id);
    expect(
      hrpDay2?.escalationCount,
      'NS-8: under the HRP profile the referral must have escalated by day 2 — the same clock code, a different profile value',
    ).toBe(1);
  });
});
