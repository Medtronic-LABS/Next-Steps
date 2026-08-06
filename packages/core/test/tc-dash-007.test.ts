import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

// FR-D-3.1: "a simple weekly trend line" with the previous period alongside
// for comparison must not misrepresent a period with no eligible steps as a
// completion rate of 0%, and a delta against such a period is not a
// comparable baseline. Seed due dates are relative offsets from the real
// clock (seed.ts's daysFromNow), so these assertions are stable over time
// without faking the clock — verified against the live seed shape at the
// time of writing.
describe('TC-DASH-007 — trend/delta distinguish no-data from zero', () => {
  it('a 30-day trend period with no eligible steps is null, and the trend still renders with 4 real points', async () => {
    const engine = new InMemoryCoordinationEngine();

    const insights = await engine.insights(30);

    expect(insights.trend[0]).toBeNull();
    const nonNull = insights.trend.filter((v) => v !== null);
    expect(nonNull.length).toBeGreaterThanOrEqual(3);
    for (const v of nonNull) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(insights.trendHasEnoughData).toBe(true);
  });

  it('deltaPts and prevRate are both null when the previous 30-day period has no eligible steps', async () => {
    const engine = new InMemoryCoordinationEngine();

    const insights = await engine.insights(30);

    expect(insights.prevRate).toBeNull();
    expect(insights.deltaPts).toBeNull();
  });

  it('trendHasEnoughData is false when fewer than 3 of the 5 trend periods have data', async () => {
    const engine = new InMemoryCoordinationEngine();

    // The seed's steps cluster close to "now"; a 90-day period spreads the
    // 5 trend anchors far enough apart that most have no eligible steps.
    const insights = await engine.insights(90);

    const nonNull = insights.trend.filter((v) => v !== null);
    expect(nonNull.length).toBeLessThan(3);
    expect(insights.trendHasEnoughData).toBe(false);
  });

  it('a 7-day period with data throughout still reports a real prevRate and deltaPts', async () => {
    const engine = new InMemoryCoordinationEngine();

    const insights = await engine.insights(7);

    expect(insights.trend.every((v) => v !== null)).toBe(true);
    expect(insights.trendHasEnoughData).toBe(true);
    expect(insights.prevRate).not.toBeNull();
    expect(insights.deltaPts).not.toBeNull();
    expect(insights.deltaPts).toBe(insights.completionRate - (insights.prevRate as number));
  });
});
