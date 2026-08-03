import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InMemoryCoordinationEngine as InMemoryCoordinationEngineType } from '../src/inMemoryEngine';
import type { WorkStep } from '../src/types';

// FR-D-3: the 7/30/90-day chips must change the underlying computation, not
// merely swap between pre-baked fixtures (ITEM-4-TEST-CASES.md TC-DASH-003
// — "An earlier commit made the toggle change the displayed fixture."). Two
// completed steps — one due 60 days ago, one due 5 days ago — fall inside
// different subsets of the 7/30/90-day windows, so each window's
// completionRate must match the §13 formula computed for that window alone,
// and the 7-day figure must differ from the 90-day figure.
const ARBITRARY_NOW = new Date('2030-10-15T09:00:00.000Z');

describe('TC-DASH-003 — period toggle changes results (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(ARBITRARY_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('7, 30 and 90-day completion rates each match the §13 formula for their own window', async () => {
    const { InMemoryCoordinationEngine } = await import('../src/inMemoryEngine');
    const { WORK } = await import('../src/seed');
    const { completionRate } = await import('../src/logic');
    const engine: InMemoryCoordinationEngineType = new InMemoryCoordinationEngine();

    const patient = await engine.createPatient({
      name: 'Period Toggle Patient',
      mobile: '90000 22233',
      gender: 'Male',
      age: 50,
      cid: 'TC-DASH-003',
      consent: true,
    });

    const sixtyDaysAgo = new Date(ARBITRARY_NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(ARBITRARY_NOW.getTime() - 5 * 24 * 60 * 60 * 1000);

    const far = await engine.recordVisit(patient.id, [
      { cat: 'LAB_INVESTIGATION', dueKey: '1m', priority: 'NORMAL', dueDate: sixtyDaysAgo },
    ]);
    const near = await engine.recordVisit(patient.id, [
      { cat: 'LAB_INVESTIGATION', dueKey: '1w', priority: 'NORMAL', dueDate: fiveDaysAgo },
    ]);

    await engine.completeStep(far.stepIds[0], ARBITRARY_NOW);
    await engine.completeStep(near.stepIds[0], ARBITRARY_NOW);

    const stateAfterCompletion: Pick<WorkStep, 'dueDate' | 'status'>[] = [
      ...WORK,
      { dueDate: sixtyDaysAgo, status: 'COMPLETED' },
      { dueDate: fiveDaysAgo, status: 'COMPLETED' },
    ];

    const expected7 = completionRate(stateAfterCompletion, 7, ARBITRARY_NOW);
    const expected30 = completionRate(stateAfterCompletion, 30, ARBITRARY_NOW);
    const expected90 = completionRate(stateAfterCompletion, 90, ARBITRARY_NOW);

    const actual7 = await engine.insights(7);
    const actual30 = await engine.insights(30);
    const actual90 = await engine.insights(90);

    expect(actual7.completionRate, '7-day window must match §13 completionRate for that window').toBe(
      expected7.rate,
    );
    expect(actual30.completionRate, '30-day window must match §13 completionRate for that window').toBe(
      expected30.rate,
    );
    expect(actual90.completionRate, '90-day window must match §13 completionRate for that window').toBe(
      expected90.rate,
    );
    expect(actual7.completionRate, '7-day and 90-day figures must differ').not.toBe(actual90.completionRate);
  });
});
