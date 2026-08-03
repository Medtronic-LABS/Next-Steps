import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completionRate } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — period membership is by due date, not visit date and not completion
// date. `completionRate` does not exist yet, so this import is expected to
// fail (same hazard as TC-MET-001).

interface MetricStep {
  id: Id;
  cat: string;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

describe('TC-MET-002 — §13 period membership follows due date, not visit or completion date (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a step due outside the period is excluded from both numerator and denominator even though it completed inside the period', () => {
    // dueDate (1 May) is outside the 30-day window ending 20 June; visitDate
    // (1 April) and completedDate (5 June) are both irrelevant to membership.
    const outOfPeriodButCompletedInPeriod: MetricStep = {
      id: 'out-of-period',
      cat: 'FOLLOW_UP_VISIT',
      dueDate: d('2026-05-01'),
      status: 'COMPLETED',
      completedDate: d('2026-06-05'),
    };
    const control: MetricStep = {
      id: 'control',
      cat: 'FOLLOW_UP_VISIT',
      dueDate: d('2026-06-15'),
      status: 'SCHEDULED',
    };

    const result = completionRate([outOfPeriodButCompletedInPeriod, control], 30);

    expect(result.denominator, 'only the in-period control counts — the out-of-period step is excluded').toBe(1);
    expect(
      result.numerator,
      'the out-of-period step contributes nothing to the numerator despite being COMPLETED',
    ).toBe(0);
  });
});
