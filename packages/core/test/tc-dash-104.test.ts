import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';

// ITEM-9-PHC-MO-DASHBOARD.md NS-18(iv) (TC-DASH-104).
//
// Hypothesizes `dashboardViews()` — same technique as TC-DASH-101. The
// PMSMA label comes from the maternal profile's categoryLabels.OTHER =
// "PMSMA visit" (packages/core/src/maternalProfile.ts) — `recordVisit`
// stamps every OTHER-category step's `detail` with that label automatically
// (packages/core/src/inMemoryEngine.ts's `getCategoryLabel(s.cat, profile)`
// call), so no extra input is needed to produce a "PMSMA-labelled OTHER
// step".

interface DashboardViews {
  pmsmaOverdueCount: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardViews?(): Promise<DashboardViews>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-10T09:00:00.000Z');

describe('TC-DASH-104 — PMSMA overdue (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts only the HRP whose PMSMA-labelled OTHER step is overdue', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const overdue = await engine.createPatient({
      name: 'PMSMA Overdue HRP',
      mobile: '+919800014101',
      gender: 'Female',
      age: 29,
      cid: 'PMSMA Overdue HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const overdueVisit = await engine.recordVisit(overdue.id, [
      { cat: 'OTHER', dueKey: '1w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() - 3 * DAY_MS) },
    ]);

    const notOverdue = await engine.createPatient({
      name: 'PMSMA Not Overdue HRP',
      mobile: '+919800014102',
      gender: 'Female',
      age: 30,
      cid: 'PMSMA Not Overdue HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.recordVisit(notOverdue.id, [
      { cat: 'OTHER', dueKey: '1w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() + 4 * DAY_MS) },
    ]);

    const overdueStepView = await engine.getStep(overdueVisit.stepIds[0]);
    expect(
      overdueStepView?.detail,
      "sanity check: the maternal profile labels this OTHER step 'PMSMA visit'",
    ).toBe('PMSMA visit');
    expect(overdueStepView?.isOverdue, '§11.1 sanity check: the fixture step really is overdue').toBe(true);

    const views = await engine.dashboardViews?.();

    expect(
      views?.pmsmaOverdueCount,
      'NS-18(iv): only the HRP with an overdue PMSMA-labelled OTHER step counts',
    ).toBe(1);
  });
});
