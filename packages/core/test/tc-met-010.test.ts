import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { upcomingLoad } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "Upcoming load: Count of open steps with dueDate in the next 14
// days, per day." A per-day series, not a single aggregate total.
// `upcomingLoad` does not exist yet, so this import is expected to fail.
//
// PROVISIONAL: far-boundary reading. §13 doesn't state whether "today" is
// counted as part of "the next 14 days" or shown in addition to them.
// Reading the fixture's own labels — due 3 July is called "day 13" and due
// 4 July "day 14" relative to today (20 June) — the window is today plus
// the 14 days that follow (offsets 0 through 14 inclusive, 15 datapoints);
// due 5 July ("day 15") falls outside it. This is flagged alongside the
// other period-boundary open questions (TC-MET-001, 003).

interface MetricStep {
  id: Id;
  dueDate: Date;
  status: StepStatus;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const STEPS: MetricStep[] = [
  { id: 'today-1', dueDate: daysFromNow(0), status: 'SCHEDULED' },
  { id: 'today-2', dueDate: daysFromNow(0), status: 'SCHEDULED' },
  { id: 'day13', dueDate: daysFromNow(13), status: 'SCHEDULED' }, // 3 July
  { id: 'day14', dueDate: daysFromNow(14), status: 'SCHEDULED' }, // 4 July
  { id: 'day15', dueDate: daysFromNow(15), status: 'SCHEDULED' }, // 5 July — outside the window
];

describe('TC-MET-010 — §13 upcoming load is a per-day series over 14 days, not a single total (PROVISIONAL, EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('today shows 2, day 13 and day 14 each show 1, day 15 is excluded, total is 4', () => {
    const result = upcomingLoad(STEPS);

    expect(result.series[0], 'today (offset 0) has both today-dated steps').toBe(2);
    expect(result.series[13], 'day 13 (3 July)').toBe(1);
    expect(result.series[14], 'day 14 (4 July) is still inside the window').toBe(1);
    expect(result.total, 'day 15 (5 July) is excluded, so total is 4, not 5').toBe(4);
  });
});
