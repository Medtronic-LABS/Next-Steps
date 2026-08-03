import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { medianDaysToCompletion } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "Median days to completion: Median of (completedDate - visitDate)
// over steps completed in the period, per category." Period membership
// here is by completedDate, NOT dueDate — the opposite rule from
// completion rate (TC-MET-002). `medianDaysToCompletion` does not exist
// yet, so this import is expected to fail.

interface MetricStep {
  id: Id;
  cat: string;
  visitDate: Date;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

// F-METRICS
const F_METRICS: MetricStep[] = [
  {
    id: 'm1',
    cat: 'FOLLOW_UP_VISIT',
    visitDate: d('2026-06-01'),
    dueDate: d('2026-06-10'),
    status: 'COMPLETED',
    completedDate: d('2026-06-08'),
  },
  {
    id: 'm2',
    cat: 'LAB_INVESTIGATION',
    visitDate: d('2026-06-01'),
    dueDate: d('2026-06-10'),
    status: 'COMPLETED',
    completedDate: d('2026-06-14'),
  },
  {
    id: 'm3',
    cat: 'SPECIALIST_REFERRAL',
    visitDate: d('2026-06-01'),
    dueDate: d('2026-06-12'),
    status: 'DECLINED',
  },
  {
    id: 'm4',
    cat: 'FOLLOW_UP_CALL',
    visitDate: d('2026-06-01'),
    dueDate: d('2026-06-12'),
    status: 'CANCELLED',
  },
  {
    id: 'm5',
    cat: 'FOLLOW_UP_VISIT',
    visitDate: d('2026-06-01'),
    dueDate: d('2026-06-15'),
    status: 'SCHEDULED',
  },
  {
    id: 'm6',
    cat: 'LAB_INVESTIGATION',
    visitDate: d('2026-04-01'),
    dueDate: d('2026-05-01'),
    status: 'SCHEDULED',
  },
];

describe('TC-MET-005 — §13 median days to completion is measured from visitDate, over steps completed in the period (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('overall median is 10 (median of 7 and 13); per category m1 gives 7 and m2 gives 13', () => {
    const result = medianDaysToCompletion(F_METRICS, 30);

    expect(result.overall, 'm1 is 7 days (8 Jun - 1 Jun), m2 is 13 days (14 Jun - 1 Jun); median of [7, 13] is 10').toBe(10);
    expect(result.byCategory['FOLLOW_UP_VISIT'], 'only m1 completed in this category').toBe(7);
    expect(result.byCategory['LAB_INVESTIGATION'], 'only m2 completed in this category').toBe(13);
  });
});
