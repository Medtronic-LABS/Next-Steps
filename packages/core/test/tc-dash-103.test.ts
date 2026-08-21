import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';

// ITEM-9-PHC-MO-DASHBOARD.md NS-18(iii) (TC-DASH-103).
//
// Hypothesizes `dashboardViews()` — same technique as TC-DASH-101. The
// sanity check below on `getStep` uses the real, already-shipped §11.1
// overdue derivation, so the fixture's "overdue" step is independently
// confirmed overdue before comparing against the (missing) dashboard figure.

interface DashboardViews {
  ancOverdueCount: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardViews?(): Promise<DashboardViews>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-10T09:00:00.000Z');

describe('TC-DASH-103 — ANC overdue (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts only the HRP whose ANC-visit step is overdue — due-today and not-yet-due stay out, and agrees with §11.1's own overdue flag on that step", async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const overdue = await engine.createPatient({
      name: 'ANC Overdue HRP',
      mobile: '+919800014001',
      gender: 'Female',
      age: 26,
      cid: 'ANC Overdue HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const overdueVisit = await engine.recordVisit(overdue.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() - 5 * DAY_MS) },
    ]);

    const dueToday = await engine.createPatient({
      name: 'ANC Due Today HRP',
      mobile: '+919800014002',
      gender: 'Female',
      age: 27,
      cid: 'ANC Due Today HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.recordVisit(dueToday.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime()) },
    ]);

    const notYetDue = await engine.createPatient({
      name: 'ANC Not Yet Due HRP',
      mobile: '+919800014003',
      gender: 'Female',
      age: 28,
      cid: 'ANC Not Yet Due HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.recordVisit(notYetDue.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() + 5 * DAY_MS) },
    ]);

    const overdueStepView = await engine.getStep(overdueVisit.stepIds[0]);
    expect(
      overdueStepView?.isOverdue,
      "§11.1 sanity check: the fixture's step really is overdue under the worklist's own derivation",
    ).toBe(true);

    const views = await engine.dashboardViews?.();

    expect(
      views?.ancOverdueCount,
      "NS-18(iii): only the HRP with an overdue FOLLOW_UP_VISIT step counts — must agree with §11.1's own overdue flag, not a separate calculation",
    ).toBe(1);
  });
});
