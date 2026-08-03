import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onTimeCompletionRate } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "On-time completion rate: COMPLETED with completedDate <= dueDate
// ÷ same denominator as [completion rate]." `onTimeCompletionRate` does
// not exist yet, so this import is expected to fail.
//
// PROVISIONAL: same period far-boundary reading as TC-MET-001 (30-day
// window ending 20 June = 22 May to 20 June inclusive).

interface MetricStep {
  id: Id;
  cat: string;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

// F-METRICS
const F_METRICS: MetricStep[] = [
  { id: 'm1', cat: 'FOLLOW_UP_VISIT', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-08') },
  { id: 'm2', cat: 'LAB_INVESTIGATION', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-14') },
  { id: 'm3', cat: 'SPECIALIST_REFERRAL', dueDate: d('2026-06-12'), status: 'DECLINED' },
  { id: 'm4', cat: 'FOLLOW_UP_CALL', dueDate: d('2026-06-12'), status: 'CANCELLED' },
  { id: 'm5', cat: 'FOLLOW_UP_VISIT', dueDate: d('2026-06-15'), status: 'SCHEDULED' },
  { id: 'm6', cat: 'LAB_INVESTIGATION', dueDate: d('2026-05-01'), status: 'SCHEDULED' },
];

describe('TC-MET-003 — §13 on-time completion rate shares the completion-rate denominator (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is 25% (1 of 4): m1 on time, m2 late, denominator is 4 (not the completed-count of 2)', () => {
    const result = onTimeCompletionRate(F_METRICS, 30);

    expect(result.numerator, 'only m1 (completed 8 Jun against due 10 Jun) is on time').toBe(1);
    expect(result.denominator, 'denominator matches completion rate\'s — 4, not 2').toBe(4);
    expect(result.rate).toBe(25);
  });
});
