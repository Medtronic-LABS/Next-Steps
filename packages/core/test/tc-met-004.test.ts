import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onTimeCompletionRate } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — on-time is `completedDate <= dueDate`, inclusive. A strict `<`
// would silently penalise every step completed on its due date, the most
// common case. `onTimeCompletionRate` does not exist yet, so this import
// is expected to fail.

interface MetricStep {
  id: Id;
  cat: string;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

describe('TC-MET-004 — §13 on-time boundary is inclusive (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a step due 10 June and completed exactly 10 June counts as on time', () => {
    const step: MetricStep = {
      id: 'on-boundary',
      cat: 'FOLLOW_UP_VISIT',
      dueDate: d('2026-06-10'),
      status: 'COMPLETED',
      completedDate: d('2026-06-10'),
    };

    const result = onTimeCompletionRate([step], 30);

    expect(result.numerator, 'completed on its due date must count as on time').toBe(1);
    expect(result.denominator).toBe(1);
    expect(result.rate).toBe(100);
  });
});
