import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InMemoryCoordinationEngine as InMemoryCoordinationEngineType } from '../src/inMemoryEngine';

// FR-D-2.2: drill() must read live coordination state, not the fixed
// DRILL map of the ten seed WORK ids (ITEM-4-TEST-CASES.md TC-DASH-002).
// A step captured for a brand-new patient, with a due date in the past, can
// never appear in `drill('overdue')` today because the row lookup only
// resolves against `WORK`. This asserts on the new patient's presence
// specifically, not just a change in row count.
const ARBITRARY_NOW = new Date('2030-10-15T09:00:00.000Z');

describe('TC-DASH-002 — drill-downs derive from live state (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(ARBITRARY_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('a newly captured overdue step for a new patient appears in the overdue drill-down', async () => {
    const { InMemoryCoordinationEngine } = await import('../src/inMemoryEngine');
    const engine: InMemoryCoordinationEngineType = new InMemoryCoordinationEngine();

    const patient = await engine.createPatient({
      name: 'Zohra Vintage Qureshi',
      mobile: '90000 11122',
      gender: 'Female',
      age: 44,
      cid: 'TC-DASH-002',
      consent: true,
    });

    const fiveDaysAgo = new Date(ARBITRARY_NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const { stepIds } = await engine.recordVisit(patient.id, [
      { cat: 'LAB_INVESTIGATION', dueKey: '1w', priority: 'NORMAL', dueDate: fiveDaysAgo },
    ]);
    const newStepId = stepIds[0];

    const overdue = await engine.drill('overdue');

    expect(
      overdue.rows.some((r) => r.patientName === patient.name),
      `expected newly captured patient "${patient.name}" to appear in the overdue drill-down`,
    ).toBe(true);
    expect(
      overdue.rows.some((r) => r.id === newStepId),
      `expected the newly captured step ${newStepId} to appear in the overdue drill-down`,
    ).toBe(true);
  });
});
