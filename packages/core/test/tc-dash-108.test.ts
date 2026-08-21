import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';

// ITEM-9-PHC-MO-DASHBOARD.md NS-19(ii) (TC-DASH-108).
//
// Hypothesizes `dashboardInsights()` for the ANC compliance figure. Per the
// existing decision this measures planned dates met, not GOI protocol
// windows — no gestational age or LMP field exists anywhere in the type
// system (packages/core/src/types.ts's WorkStep has no such field), so
// there is nothing for a real implementation to derive that from even by
// accident. The label assertion below guards against the label text
// silently reintroducing the protocol-window framing (BR-017/AP-7).

interface DashboardInsights {
  ancComplianceRate: number;
  ancComplianceLabel: string;
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardInsights?(): Promise<DashboardInsights>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-10T09:00:00.000Z');

describe('TC-DASH-108 — ANC compliance is planned-dates, not protocol-windows (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is completed ÷ due ANC steps, with a "planned date met" label', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    const onTime = await engine.createPatient({
      name: 'ANC On Time HRP',
      mobile: '+919800018001',
      gender: 'Female',
      age: 26,
      cid: 'ANC On Time HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const onTimeVisit = await engine.recordVisit(onTime.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() + 10 * DAY_MS) },
    ]);

    const late = await engine.createPatient({
      name: 'ANC Late HRP',
      mobile: '+919800018002',
      gender: 'Female',
      age: 27,
      cid: 'ANC Late HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    const lateVisit = await engine.recordVisit(late.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() + 2 * DAY_MS) },
    ]);

    const stillOpenOverdue = await engine.createPatient({
      name: 'ANC Still Open Overdue HRP',
      mobile: '+919800018003',
      gender: 'Female',
      age: 28,
      cid: 'ANC Still Open Overdue HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.recordVisit(stillOpenOverdue.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() - 3 * DAY_MS) },
    ]);

    const stillOpenNotDue = await engine.createPatient({
      name: 'ANC Still Open Not Due HRP',
      mobile: '+919800018004',
      gender: 'Female',
      age: 29,
      cid: 'ANC Still Open Not Due HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.recordVisit(stillOpenNotDue.id, [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '2w', priority: 'NORMAL', dueDate: new Date(NOW.getTime() + 20 * DAY_MS) },
    ]);

    // Completed before its due date — "on time".
    vi.setSystemTime(new Date(NOW.getTime() + 6 * DAY_MS));
    await engine.completeStep(lateVisit.stepIds[0], new Date(NOW.getTime() + 6 * DAY_MS));
    vi.setSystemTime(new Date(NOW.getTime() + 8 * DAY_MS));
    await engine.completeStep(onTimeVisit.stepIds[0], new Date(NOW.getTime() + 8 * DAY_MS));

    const insights = await engine.dashboardInsights?.();

    expect(
      insights?.ancComplianceRate,
      'NS-19(ii): 2 completed of 4 due ANC steps is 50% — planned dates only, no gestational-age window',
    ).toBe(50);
    expect(
      insights?.ancComplianceLabel,
      'NS-19(ii): the UI label must read "planned date met", never "protocol window met"',
    ).toBe('planned date met');
  });
});
