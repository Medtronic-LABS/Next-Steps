import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { medianDaysToCompletion, onTimeCompletionRate } from '../src/logic';

// Demo integrity, not a spec clause: the completed list and the
// completion-rate metric describe the same underlying state and must agree,
// and the seed must contain enough real completions for the demo's
// completion, on-time and median-days figures to be meaningful rather than
// all-zero or all-100%.
describe('TC-SEED-002 — the completed list agrees with the completion-rate metric', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('every doneRows() entry is backed by a step whose status is COMPLETED', async () => {
    const engine = new InMemoryCoordinationEngine();

    const steps = await engine.insightsSteps();
    const completed = steps.filter((s) => s.status === 'COMPLETED');
    const completedDescriptions = await Promise.all(
      completed.map(async (s) => ({
        name: (await engine.getPatient(s.pid))?.name,
        detail: engine.categoryLabel(s.cat),
      })),
    );

    const done = await engine.doneRows();

    for (const row of done) {
      expect(
        completedDescriptions.some((d) => d.name === row.name && d.detail === row.detail),
        `doneRows() row ${JSON.stringify(row)} is not backed by any COMPLETED step`,
      ).toBe(true);
    }
  });

  it('the 30-day completion rate is strictly between 0% and 100%', async () => {
    const engine = new InMemoryCoordinationEngine();

    const insights = await engine.insights(30);

    expect(insights.completionRate).toBeGreaterThan(0);
    expect(insights.completionRate).toBeLessThan(100);
  });

  it('the on-time rate is strictly greater than 0% and no greater than the completion rate', async () => {
    const engine = new InMemoryCoordinationEngine();

    const insights = await engine.insights(30);
    const steps = await engine.insightsSteps();
    const onTime = onTimeCompletionRate(steps, 30);

    expect(onTime.rate).toBeGreaterThan(0);
    expect(onTime.rate).toBeLessThanOrEqual(insights.completionRate);
  });

  it('median days to completion is greater than zero', async () => {
    const engine = new InMemoryCoordinationEngine();

    const steps = await engine.insightsSteps();
    const medians = medianDaysToCompletion(
      steps.map((s) => ({ ...s, visitDate: s.visitDate ?? s.dueDate })),
      30,
    );

    expect(medians.overall).toBeGreaterThan(0);
  });
});
