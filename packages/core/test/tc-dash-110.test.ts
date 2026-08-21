import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { RoleContext } from '../src/types';

// ITEM-9-PHC-MO-DASHBOARD.md NS-19(iv) (TC-DASH-110).
//
// Hypothesizes `dashboardInsights()` for the tracking success rate —
// same technique as TC-DASH-107/108/109. Numerator is every "completed"
// leaf (any of NS-7's three COMPLETED_* sub-types); denominator is every
// recorded tracking outcome, HRP-scoped.

interface DashboardInsights {
  trackingSuccessRate: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardInsights?(): Promise<DashboardInsights>;
};

const FACILITY = 'FAC-DH-001';
const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'PHC-RAMPUR' };

describe('TC-DASH-110 — tracking success rate (EXPECTED FAIL)', () => {
  it('is every "completed" sub-type ÷ all recorded tracking outcomes, HRP-scoped', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const outcomes = [
      'COMPLETED_REFERRED_PUBLIC_FACILITY',
      'COMPLETED_OTHER_PUBLIC_FACILITY',
      'COMPLETED_PRIVATE_FACILITY',
      'PLAN_TO_GO_LATER',
      'DOES_NOT_WANT_TO_GO',
      'COULD_NOT_BE_CONTACTED',
    ] as const;

    for (let i = 0; i < outcomes.length; i++) {
      const patient = await engine.createPatient({
        name: `Tracking HRP ${i + 1}`,
        mobile: `+91980001920${i + 1}`,
        gender: 'Female',
        age: 26 + i,
        cid: `Tracking HRP ${i + 1}`,
        consent: true,
        registeredAtFacilityId: 'PHC-RAMPUR',
        pregnancyStatus: 'HIGH_RISK',
      });
      const referral = await engine.raiseReferral(
        patient.id,
        { expectedAtFacilityId: FACILITY, direction: 'UPWARD' },
        anmContext,
      );
      const outcome = outcomes[i];
      await engine.recordTrackingOutcome(
        referral.id,
        outcome === 'COMPLETED_PRIVATE_FACILITY'
          ? { outcome, privateFollowUpDate: new Date('2026-09-01T00:00:00Z') }
          : { outcome },
        anmContext,
      );
    }

    const insights = await engine.dashboardInsights?.();

    expect(
      insights?.trackingSuccessRate,
      'NS-19(iv): 3 completed sub-types of 6 recorded HRP tracking outcomes is 50%',
    ).toBe(50);
  });
});
