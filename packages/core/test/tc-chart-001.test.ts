import { describe, expect, it } from 'vitest';
import { trendPath } from '../src/logic';

// FR-D-3.1 presentation fix: the completion-rate trend chart must (a) never
// draw a line across a period with no data, and (b) never produce a
// coordinate outside its own viewBox — the two ways the old fixed-domain,
// zero-substituted trend used to overflow its card.
describe('TC-CHART-001 — trendPath omits gaps and stays within bounds', () => {
  it('omits null periods from dots and does not connect a line across the gap', () => {
    const { segments, dots } = trendPath([null, 100, 100, 70, 53]);

    expect(dots).toHaveLength(4);
    // A single run of 4 consecutive valid points is one unbroken segment.
    expect(segments).toHaveLength(1);
    expect(segments[0].line.split(' ')).toHaveLength(4);
  });

  it('splits into separate segments around an interior gap', () => {
    const { segments, dots } = trendPath([100, null, 70, 53, null]);

    expect(dots).toHaveLength(3);
    expect(segments).toHaveLength(2);
    expect(segments[0].line.split(' ')).toHaveLength(1);
    expect(segments[1].line.split(' ')).toHaveLength(2);
  });

  it('clamps every coordinate to the chart box even for out-of-band values', () => {
    const H = 88;
    const { dots } = trendPath([0, 100]);

    for (const d of dots) {
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(H);
    }
  });

  it('produces no segments when every period is null', () => {
    const { segments, dots } = trendPath([null, null, null]);

    expect(segments).toHaveLength(0);
    expect(dots).toHaveLength(0);
  });
});
