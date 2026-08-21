import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { RoleContext } from '../src/types';

// ITEM-9-PHC-MO-DASHBOARD.md NS-18(ii) (TC-DASH-102).
//
// Hypothesizes `dashboardViews()` — same technique as TC-DASH-101.

interface DashboardViews {
  referralsPending: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardViews?(): Promise<DashboardViews>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'PHC-RAMPUR' };
const FACILITY = 'FAC-DH-001';

describe('TC-DASH-102 — referrals pending (EXPECTED FAIL)', () => {
  it('counts only the HRP with a still-open referral — a resolved-only referral, no referral, and a non-HRP with an open referral all stay out', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const openReferralHrp = await engine.createPatient({
      name: 'Open Referral HRP',
      mobile: '+919800013001',
      gender: 'Female',
      age: 28,
      cid: 'Open Referral HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.raiseReferral(openReferralHrp.id, { expectedAtFacilityId: FACILITY, direction: 'UPWARD' }, anmContext);

    const resolvedOnlyHrp = await engine.createPatient({
      name: 'Resolved Only HRP',
      mobile: '+919800013002',
      gender: 'Female',
      age: 29,
      cid: 'Resolved Only HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const resolvedReferral = await engine.raiseReferral(
      resolvedOnlyHrp.id,
      { expectedAtFacilityId: FACILITY, direction: 'UPWARD' },
      anmContext,
    );
    await engine.closeReferral(resolvedReferral.id, anmContext, { completionLocation: 'REFERRED_PUBLIC_FACILITY' });

    await engine.createPatient({
      name: 'No Referral HRP',
      mobile: '+919800013003',
      gender: 'Female',
      age: 30,
      cid: 'No Referral HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });

    const openReferralNonHrp = await engine.createPatient({
      name: 'Open Referral Non-HRP',
      mobile: '+919800013004',
      gender: 'Female',
      age: 27,
      cid: 'Open Referral Non-HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'NORMAL',
    });
    await engine.raiseReferral(
      openReferralNonHrp.id,
      { expectedAtFacilityId: FACILITY, direction: 'UPWARD' },
      anmContext,
    );

    const views = await engine.dashboardViews?.();

    expect(
      views?.referralsPending,
      'NS-18(ii): exactly one HRP has a pending referral — resolved-only, none, and non-HRP all stay out',
    ).toBe(1);
  });
});
