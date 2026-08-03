import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completionRate } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "Completion rate (overall and per category): Steps with status
// COMPLETED ÷ steps with dueDate in period and status not CANCELLED.
// DECLINED counts in the denominator (a declined action is uncompleted
// care); CANCELLED (entry error) is excluded." `completionRate` does not
// exist on packages/core/src/logic.ts yet — insights() still returns the
// hardcoded INSIGHTS_BY_PERIOD lookup (ITEM-4-TEST-CASES.md) — so this
// import is expected to fail.
//
// PROVISIONAL: period-membership far boundary. §13 doesn't state whether
// the N-day window is inclusive at both ends. ITEM-4-TEST-CASES.md's
// provisional reading is "N days ending today, inclusive" — for N=30 and
// today=20 June, that's 22 May to 20 June inclusive. m6 (due 1 May) sits
// outside that window under this reading; a different boundary rule could
// pull it in. Flagged alongside the 48-hour reopen boundary and section
// precedence open questions.

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

describe('TC-MET-001 — §13 overall completion rate (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is 50% (2 of 4): m1/m2 in numerator, m1/m2/m3/m5 in denominator, m4 and m6 excluded', () => {
    const result = completionRate(F_METRICS, 30);

    expect(result.numerator, 'numerator is m1, m2').toBe(2);
    expect(result.denominator, 'denominator is m1, m2, m3, m5 — not m4 (cancelled) or m6 (outside period)').toBe(4);
    expect(result.rate, 'rate is 2/4').toBe(50);
  });
});
