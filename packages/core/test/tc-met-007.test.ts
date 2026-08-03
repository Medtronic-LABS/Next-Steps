import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overdueBuckets } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "Overdue next steps: Count of open steps with isOverdue = true, as
// of now (snapshot, not period-bound); aged buckets 1-7 / 8-30 / 31-90 /
// 90+ days." No period parameter — this metric is a snapshot and must
// never apply the period-by-due-date filter that completion rate uses.
// `overdueBuckets` does not exist yet, so this import is expected to fail.

interface MetricStep {
  id: Id;
  dueDate: Date;
  status: StepStatus;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const step = (id: Id, daysOverdue: number): MetricStep => ({
  id,
  dueDate: daysAgo(daysOverdue),
  status: 'SCHEDULED',
});

const STEPS: MetricStep[] = [
  step('d1', 1),
  step('d7', 7),
  step('d8', 8),
  step('d30', 30),
  step('d31', 31),
  step('d90', 90),
  step('d91', 91),
];

describe('TC-MET-007 — §13 overdue buckets are a snapshot, mutually exclusive, and boundary-inclusive at both ends (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('buckets 1-7, 8-30, 31-90 and 90+ each hold exactly the expected ids, with none excluded for lying outside any period', () => {
    const result = overdueBuckets(STEPS);

    expect(result['1-7'].sort()).toEqual(['d1', 'd7']);
    expect(result['8-30'].sort()).toEqual(['d30', 'd8']);
    expect(result['31-90'].sort()).toEqual(['d31', 'd90']);
    expect(result['90+'].sort()).toEqual(['d91']);

    const total =
      result['1-7'].length + result['8-30'].length + result['31-90'].length + result['90+'].length;
    expect(total, 'all 7 steps are bucketed — the 90+ day backlog (d91) is not dropped by a period filter').toBe(7);
  });
});
