import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { Id, RoleContext } from '../src/types';

// ITEM-9-PHC-MO-DASHBOARD.md NS-18(v) (TC-DASH-105).
//
// `worklist(context, 'AT_RISK_OF_DROP_OUT')` is the real, already-shipped
// NS-9 derivation (packages/core/src/inMemoryEngine.ts's private
// `isAtRiskOfDropOut`, escalationCount >= 2). This hypothesizes
// `dashboardViews()` as the PHC MO figure and asserts it must equal that
// real derivation's own output exactly — not a reimplementation with its
// own threshold, per the TC's explicit instruction.

interface DashboardViews {
  atRiskOfDropOutIds: Id[];
}

type EngineWithDashboard = InMemoryCoordinationEngine & {
  dashboardViews?(): Promise<DashboardViews>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date('2026-08-01T09:00:00.000Z');
const FACILITY = 'FAC-DH-001';
const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'PHC-RAMPUR' };

describe('TC-DASH-105 — at-risk of drop-out reuses NS-9 (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("equals NS-9's AT_RISK_OF_DROP_OUT worklist result exactly, not a reimplementation with its own threshold", async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE }) as EngineWithDashboard;

    // Raised at START; by the final check 4 days have elapsed against the
    // default 2-day escalation window (NS-8) — escalationCount reaches 2.
    const twiceEscalated = await engine.createPatient({
      name: 'Twice Escalated HRP',
      mobile: '+919800015001',
      gender: 'Female',
      age: 29,
      cid: 'Twice Escalated HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.raiseReferral(twiceEscalated.id, { expectedAtFacilityId: FACILITY, direction: 'UPWARD' }, anmContext);

    // Raised a day later, so only 3 of the remaining days elapse for it by
    // the same final check — one window, escalationCount = 1.
    vi.setSystemTime(new Date(START.getTime() + DAY_MS));
    const onceEscalated = await engine.createPatient({
      name: 'Once Escalated HRP',
      mobile: '+919800015002',
      gender: 'Female',
      age: 31,
      cid: 'Once Escalated HRP',
      consent: true,
      registeredAtFacilityId: 'PHC-RAMPUR',
      pregnancyStatus: 'HIGH_RISK',
    });
    await engine.raiseReferral(onceEscalated.id, { expectedAtFacilityId: FACILITY, direction: 'UPWARD' }, anmContext);

    vi.setSystemTime(new Date(START.getTime() + 4 * DAY_MS));

    const atRisk = await engine.worklist(anmContext, 'AT_RISK_OF_DROP_OUT');
    expect(
      atRisk.map((r) => r.id),
      'NS-9 sanity check: exactly the escalationCount>=2 patient is at risk under the real worklist filter',
    ).toEqual([twiceEscalated.id]);
    expect(
      atRisk.some((r) => r.id === onceEscalated.id),
      'NS-9 sanity check: escalationCount 1 does not qualify',
    ).toBe(false);

    const views = await engine.dashboardViews?.();

    expect(
      views?.atRiskOfDropOutIds,
      "NS-18(v): the dashboard figure must equal NS-9's own AT_RISK_OF_DROP_OUT derivation exactly",
    ).toEqual(atRisk.map((r) => r.id));
  });
});
