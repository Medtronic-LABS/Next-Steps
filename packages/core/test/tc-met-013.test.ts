import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lostToFollowUp } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "Lost to follow-up: Distinct patients where every open step is >=
// lostToFollowUpDays overdue (default 30) AND unreachableAttempts >=
// threshold on the most recent of them, AND no visit since. Default
// proposal — pilot-configurable and listed as an open question (Section
// 20)." `lostToFollowUp` does not exist yet, so this import is expected
// to fail.
//
// PROVISIONAL: §13 itself flags this whole definition as a default
// proposal and a Section 20/21 open question, not settled — in
// particular, "no visit since" is read here as "no visit since the open
// steps became due." The discriminating clause under test is "every,"
// not "any": a single step short of the threshold disqualifies the
// patient even if their other steps clearly qualify.

interface MetricStep {
  dueDate: Date;
  status: StepStatus;
  attempts: number;
}

interface MetricPatient {
  patientId: Id;
  steps: MetricStep[];
  lastVisitDate: Date;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

// pX: both open steps 35 days overdue, most recent has attempts 4 against
// threshold 3, and no visit since (last visit predates both steps' due date).
const pX: MetricPatient = {
  patientId: 'pX',
  steps: [
    { dueDate: daysAgo(35), status: 'SCHEDULED', attempts: 2 },
    { dueDate: daysAgo(35), status: 'SCHEDULED', attempts: 4 },
  ],
  lastVisitDate: daysAgo(36),
};

// pY: one step 35 days overdue, one only 5 days overdue — fails the
// "every open step" clause regardless of attempts or visit history.
const pY: MetricPatient = {
  patientId: 'pY',
  steps: [
    { dueDate: daysAgo(35), status: 'SCHEDULED', attempts: 4 },
    { dueDate: daysAgo(5), status: 'SCHEDULED', attempts: 4 },
  ],
  lastVisitDate: daysAgo(2),
};

describe('TC-MET-013 — §13 lost to follow-up requires EVERY open step to qualify, not any (PROVISIONAL, EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts pX but not pY, result is 1', () => {
    const result = lostToFollowUp([pX, pY], { threshold: 3, lostToFollowUpDays: 30 });

    expect(result, 'pY has one step only 5 days overdue, so it does not qualify despite the other step').toBe(1);
  });
});
