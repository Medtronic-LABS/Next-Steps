import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { RoleContext } from '../src/types';

// ITEM-9-PHC-MO-DASHBOARD.md NS-18(vi) (TC-DASH-106).
//
// NS-9 already defines a broader "lost to follow" derived state — the
// private `isLostToFollow` behind the `LOST_TO_FOLLOW` worklist filter
// (packages/core/src/inMemoryEngine.ts) — that treats "does not want to go"
// and "could not be contacted" the same way. This dashboard figure is a
// distinct, narrower, dashboard-scoped redefinition (only "does not want to
// go") and must be named/added separately, never overwrite NS-9's original.
// Hypothesizes `dashboardViews()` for it — same technique as TC-DASH-101.

interface DashboardViews {
  lostToFollowUpCount: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardViews?(): Promise<DashboardViews>;
};

const FACILITY = 'FAC-DH-001';
const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'PHC-RAMPUR' };

describe('TC-DASH-106 — lost to follow-up excludes unreachable (EXPECTED FAIL)', () => {
  it('counts only "does not want to go" — "could not be contacted" stays out of this figure but still surfaces in NS-9\'s broader LOST_TO_FOLLOW', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const doesNotWantToGo = await engine.createPatient({
      name: 'Does Not Want To Go HRP',
      mobile: '+919800016001',
      gender: 'Female',
      age: 30,
      cid: 'Does Not Want To Go HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const referralA = await engine.raiseReferral(
      doesNotWantToGo.id,
      { expectedAtFacilityId: FACILITY, direction: 'UPWARD' },
      anmContext,
    );
    await engine.recordTrackingOutcome(referralA.id, { outcome: 'DOES_NOT_WANT_TO_GO' }, anmContext);

    const couldNotBeContacted = await engine.createPatient({
      name: 'Could Not Be Contacted HRP',
      mobile: '+919800016002',
      gender: 'Female',
      age: 32,
      cid: 'Could Not Be Contacted HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const referralB = await engine.raiseReferral(
      couldNotBeContacted.id,
      { expectedAtFacilityId: FACILITY, direction: 'UPWARD' },
      anmContext,
    );
    await engine.recordTrackingOutcome(referralB.id, { outcome: 'COULD_NOT_BE_CONTACTED' }, anmContext);

    const broaderLostToFollow = await engine.worklist(anmContext, 'LOST_TO_FOLLOW');
    expect(
      broaderLostToFollow.map((r) => r.id).sort(),
      "NS-9 sanity check: the broader worklist definition still carries both — 'could not be contacted' is not silently dropped from every view, only from this dashboard figure",
    ).toEqual([couldNotBeContacted.id, doesNotWantToGo.id].sort());

    const views = await engine.dashboardViews?.();

    expect(
      views?.lostToFollowUpCount,
      'NS-18(vi): this dashboard-scoped figure counts only "does not want to go" — exactly 1, not NS-9\'s broader 2',
    ).toBe(1);
  });
});
