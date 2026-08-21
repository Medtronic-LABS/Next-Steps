import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';

// ITEM-9-PHC-MO-DASHBOARD.md NS-18(i) (TC-DASH-101).
//
// No dashboard figure exists anywhere in the engine yet — grepping
// packages/core/src for "NS-18", "NS-19" and "dashboard" as identifiers
// returns nothing. This hypothesizes `dashboardViews()` as the PHC MO
// dashboard's read method, reached only through an optional chain on a
// cast, so it resolves to `undefined` rather than throwing — the failures
// below are genuine numeric mismatches, not thrown errors.

interface DashboardViews {
  totalRegistered: number;
  hrpCount: number;
  hrpPercentage: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardViews?(): Promise<DashboardViews>;
};

describe('TC-DASH-101 — HRP percentage (EXPECTED FAIL)', () => {
  it('is 30% for 3 HRPs among 10 registered pregnant women, and never counts a non-HRP in the numerator', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    for (let i = 0; i < 3; i++) {
      await engine.createPatient({
        name: `HRP Patient ${i + 1}`,
        mobile: `+9198000120${i + 1}`,
        gender: 'Female',
        age: 26 + i,
        cid: `HRP Patient ${i + 1}`,
        consent: true,
        registeredAtFacilityId: 'PHC-RAMPUR',
        pregnancyStatus: 'HIGH_RISK',
      });
    }
    for (let i = 0; i < 7; i++) {
      await engine.createPatient({
        name: `Normal Patient ${i + 1}`,
        mobile: `+9198000121${i + 1}`,
        gender: 'Female',
        age: 24 + i,
        cid: `Normal Patient ${i + 1}`,
        consent: true,
        registeredAtFacilityId: 'PHC-RAMPUR',
        pregnancyStatus: 'NORMAL',
      });
    }

    const views = await engine.dashboardViews?.();

    expect(views?.totalRegistered, 'NS-18(i): denominator is every registered pregnant woman in scope').toBe(10);
    expect(views?.hrpCount, 'NS-18(i): numerator is only the HRP-flagged patients — 3, never more').toBe(3);
    expect(views?.hrpPercentage, 'NS-18(i): 3 of 10 HRP-flagged is 30%').toBe(30);
  });
});
