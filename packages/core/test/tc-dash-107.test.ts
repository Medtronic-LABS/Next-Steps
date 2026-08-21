import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { RoleContext } from '../src/types';

// ITEM-9-PHC-MO-DASHBOARD.md NS-19(i) (TC-DASH-107).
//
// `referralResolutionSummary()` is the real, already-shipped NS-6 total
// (public/private split only — packages/core/src/inMemoryEngine.ts). This
// hypothesizes `dashboardInsights()` for the three-way completion-location
// split NS-19(i) additionally asks for, and asserts the totals must agree
// with NS-6 exactly, reached only through an optional chain on a cast.

interface DashboardInsights {
  referralClosure: {
    totalResolved: number;
    pending: number;
    referredPublicFacility: number;
    otherPublicFacility: number;
    privateFacility: number;
  };
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardInsights?(): Promise<DashboardInsights>;
};

const FACILITY = 'FAC-DH-001';
const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'PHC-RAMPUR' };

describe('TC-DASH-107 — referral closure status by location (EXPECTED FAIL)', () => {
  it('matches NS-6 exactly: total resolved and the three-way location split, with the still-open referral excluded from resolved but visible as pending', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const patients = [];
    for (let i = 0; i < 4; i++) {
      patients.push(
        await engine.createPatient({
          name: `Referral HRP ${i + 1}`,
          mobile: `+91980001700${i + 1}`,
          gender: 'Female',
          age: 26 + i,
          cid: `Referral HRP ${i + 1}`,
          consent: true,
          registeredAtFacilityId: 'PHC-RAMPUR',
          pregnancyStatus: 'HIGH_RISK',
        }),
      );
    }

    const referrals = [];
    for (const patient of patients) {
      referrals.push(
        await engine.raiseReferral(patient.id, { expectedAtFacilityId: FACILITY, direction: 'UPWARD' }, anmContext),
      );
    }

    await engine.recordTrackingOutcome(referrals[0].id, { outcome: 'COMPLETED_REFERRED_PUBLIC_FACILITY' }, anmContext);
    await engine.recordTrackingOutcome(referrals[1].id, { outcome: 'COMPLETED_OTHER_PUBLIC_FACILITY' }, anmContext);
    await engine.recordTrackingOutcome(
      referrals[2].id,
      { outcome: 'COMPLETED_PRIVATE_FACILITY', privateFollowUpDate: new Date('2026-09-01T00:00:00Z') },
      anmContext,
    );
    // referrals[3] stays open.

    const ns6Summary = await engine.referralResolutionSummary(anmContext);
    expect(ns6Summary, 'NS-6 sanity check: 3 resolved total, 2 public + 1 private').toEqual({
      total: 3,
      public: 2,
      private: 1,
    });

    const insights = await engine.dashboardInsights?.();

    expect(insights?.referralClosure.totalResolved, 'NS-19(i): total resolved must match NS-6 exactly').toBe(
      ns6Summary.total,
    );
    expect(insights?.referralClosure.referredPublicFacility, 'NS-19(i): REFERRED_PUBLIC_FACILITY split').toBe(1);
    expect(insights?.referralClosure.otherPublicFacility, 'NS-19(i): OTHER_PUBLIC_FACILITY split').toBe(1);
    expect(
      insights?.referralClosure.privateFacility,
      "NS-19(i): PRIVATE_FACILITY split must match NS-6's private count",
    ).toBe(ns6Summary.private);
    expect(
      insights?.referralClosure.pending,
      'NS-19(i): the still-open referral is excluded from resolved but visible as a separate pending count',
    ).toBe(1);
  });
});
