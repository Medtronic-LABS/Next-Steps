import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ProgrammeProfile } from '../src/profile';
import type { Id, Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-7, NS-8 (batch 8c — TC-TRK-003).
//
// Neither `escalationCount` nor a tracking-outcome recorder exists. This is
// the subtle case the spec calls out by name: "plan to go later" must reset
// the escalation *clock* but leave the *count* untouched. Both halves are
// asserted below as real comparisons against `getReferral`'s (real method,
// hypothesized field) return value, reached with vitest fake timers (house
// convention, e.g. tc-ref-002.test.ts). `recordTrackingOutcome` is reached
// only through optional chaining on a cast engine, so it resolves to
// `undefined` and never throws — the failures below are clean `expect`
// mismatches, not thrown errors.

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type EscalationProfile = ProgrammeProfile & { escalationWindowDays?: number };
type TrackedReferral = Referral & { escalationCount?: number };

type EngineWithTracking = InMemoryCoordinationEngine & {
  getReferral(referralId: Id): Promise<TrackedReferral | undefined>;
  recordTrackingOutcome?(
    referralId: Id,
    input: { outcome: 'PLAN_TO_GO_LATER' },
    context: RoleContext,
  ): Promise<TrackedReferral>;
};

const hrpProfile: EscalationProfile = { escalationWindowDays: 2 };
const WINDOW_MS = hrpProfile.escalationWindowDays! * DAY_MS;

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };

describe('TC-TRK-003 — "plan to go later" resets the clock, not the count (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not re-escalate immediately, keeps the count at 1, then escalates again after the window from the tracking action', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: hrpProfile }) as EngineWithTracking;

    const patient = await engine.createPatient({
      name: 'Plan To Go Later Patient',
      mobile: '+919800003001',
      gender: 'Female',
      age: 31,
      cid: 'Plan To Go Later Patient',
      consent: true,
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const referral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // Given: escalated once, escalationCount 1.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + WINDOW_MS));
    const escalatedOnce = await engine.getReferral(referral.id);
    expect(
      escalatedOnce?.escalationCount,
      'NS-8: after one escalation window the referral must have escalated once — no escalation mechanism exists',
    ).toBe(1);
    const trackingAt = RAISED_AT.getTime() + WINDOW_MS;

    // When: "plan to go later" is recorded at trackingAt.
    const trackingResult = await engine.recordTrackingOutcome?.(
      referral.id,
      { outcome: 'PLAN_TO_GO_LATER' },
      ashaContext,
    );
    expect(
      trackingResult,
      'NS-7: "plan to go later" must be accepted — recordTrackingOutcome does not exist',
    ).toBeDefined();

    // Then, first half: advancing by less than the window from the tracking
    // action fires no second escalation. The referral stays open.
    // escalationCount remains 1 — not reset by "plan to go later".
    vi.setSystemTime(new Date(trackingAt + WINDOW_MS - DAY_MS));
    const beforeWindowElapses = await engine.getReferral(referral.id);
    expect(
      beforeWindowElapses?.status,
      'NS-7: "plan to go later" does not resolve the referral — it must stay open',
    ).toBe('PENDING');
    expect(
      beforeWindowElapses?.escalationCount,
      'NS-8: "plan to go later" resets the clock but must NOT reset escalationCount — it must remain 1',
    ).toBe(1);

    // Then, second half: advancing past the window measured from the
    // tracking action (not from raisedAt) fires the second escalation and
    // the count becomes 2.
    vi.setSystemTime(new Date(trackingAt + WINDOW_MS));
    const afterWindowElapses = await engine.getReferral(referral.id);
    expect(
      afterWindowElapses?.escalationCount,
      'NS-8: the escalation clock resets from the tracking action — the second escalation must fire a full window after it, making the count 2',
    ).toBe(2);
  });
});
