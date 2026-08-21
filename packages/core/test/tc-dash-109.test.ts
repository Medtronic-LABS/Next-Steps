import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';

// ITEM-9-PHC-MO-DASHBOARD.md NS-19(iii) (TC-DASH-109).
//
// Hypothesizes `dashboardInsights()` for the PMSMA attendance figure —
// same technique as TC-DASH-107/108. A non-HRP patient's PMSMA attendance
// is included in the fixture specifically to prove HRP-scoping, per the
// TC's "Then" clause.

interface DashboardInsights {
  pmsmaAttendanceRate: number;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardInsights?(): Promise<DashboardInsights>;
};

const NOW = new Date('2026-08-10T09:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('TC-DASH-109 — PMSMA attendance rate (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is attended ÷ scheduled, HRP-scoped only — a non-HRP attendance must not appear', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const attendedIds: string[] = [];
    const openIds: string[] = [];

    for (let i = 0; i < 2; i++) {
      const patient = await engine.createPatient({
        name: `PMSMA Attended HRP ${i + 1}`,
        mobile: `+91980001910${i + 1}`,
        gender: 'Female',
        age: 26 + i,
        cid: `PMSMA Attended HRP ${i + 1}`,
        consent: true,
        registeredAtFacilityId: 'PHC-RAMPUR',
        pregnancyStatus: 'HIGH_RISK',
      });
      const visit = await engine.recordVisit(patient.id, [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }]);
      attendedIds.push(visit.stepIds[0]);
    }

    for (let i = 0; i < 2; i++) {
      const patient = await engine.createPatient({
        name: `PMSMA Not Attended HRP ${i + 1}`,
        mobile: `+91980001911${i + 1}`,
        gender: 'Female',
        age: 28 + i,
        cid: `PMSMA Not Attended HRP ${i + 1}`,
        consent: true,
        registeredAtFacilityId: 'PHC-RAMPUR',
        pregnancyStatus: 'HIGH_RISK',
      });
      const visit = await engine.recordVisit(patient.id, [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }]);
      openIds.push(visit.stepIds[0]);
    }

    const nonHrp = await engine.createPatient({
      name: 'PMSMA Attended Non-HRP',
      mobile: '+919800019120',
      gender: 'Female',
      age: 25,
      cid: 'PMSMA Attended Non-HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'NORMAL',
    });
    const nonHrpVisit = await engine.recordVisit(nonHrp.id, [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }]);

    vi.setSystemTime(new Date(NOW.getTime() + 3 * DAY_MS));
    for (const stepId of attendedIds) {
      await engine.completeStep(stepId, new Date(NOW.getTime() + 3 * DAY_MS));
    }
    await engine.completeStep(nonHrpVisit.stepIds[0], new Date(NOW.getTime() + 3 * DAY_MS));
    // openIds' two steps stay uncompleted.

    const insights = await engine.dashboardInsights?.();

    expect(
      insights?.pmsmaAttendanceRate,
      'NS-19(iii): 2 attended of 4 scheduled HRP PMSMA steps is 50% — the completed non-HRP step must not shift this',
    ).toBe(50);
  });
});
