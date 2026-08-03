import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { medianDaysToCompletion } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — median with an odd count of completed steps: the middle value,
// not the mean. TC-MET-005 covers the even-count path (mean of the two
// middle values); this covers odd. `medianDaysToCompletion` does not
// exist yet, so this import is expected to fail.

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

// Three completed steps, durations 4, 9 and 20 days, all completed within
// the 30-day period ending 20 June.
const STEPS: MetricStep[] = [
  {
    id: 's-4d',
    cat: 'FOLLOW_UP_VISIT',
    visitDate: d('2026-06-06'),
    dueDate: d('2026-06-12'),
    status: 'COMPLETED',
    completedDate: d('2026-06-10'),
  },
  {
    id: 's-9d',
    cat: 'FOLLOW_UP_VISIT',
    visitDate: d('2026-06-06'),
    dueDate: d('2026-06-16'),
    status: 'COMPLETED',
    completedDate: d('2026-06-15'),
  },
  {
    id: 's-20d',
    cat: 'FOLLOW_UP_VISIT',
    visitDate: d('2026-05-29'),
    dueDate: d('2026-06-19'),
    status: 'COMPLETED',
    completedDate: d('2026-06-18'),
  },
];

describe('TC-MET-006 — §13 median with an odd count is the middle value, not the mean (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('median of durations 4, 9, 20 is 9', () => {
    const result = medianDaysToCompletion(STEPS, 30);

    expect(result.overall, 'the middle value of [4, 9, 20] is 9, not the mean of 11').toBe(9);
  });
});
