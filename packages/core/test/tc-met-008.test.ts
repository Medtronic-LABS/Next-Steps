import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { patientsNeedingAttention } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13 — "Patients needing attention: Distinct patients having >= 1 overdue
// or unreachable open step (snapshot)." Counting steps instead of distinct
// patients overstates the doctor dashboard's hero number.
// `patientsNeedingAttention` does not exist yet, so this import is
// expected to fail.

interface MetricStep {
  id: Id;
  pid: Id;
  dueDate: Date;
  status: StepStatus;
  attempts: number;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

// pA: three overdue open steps, all reachable (attempts below threshold).
const pASteps: MetricStep[] = [
  { id: 'a1', pid: 'pA', dueDate: daysAgo(5), status: 'SCHEDULED', attempts: 0 },
  { id: 'a2', pid: 'pA', dueDate: daysAgo(10), status: 'SCHEDULED', attempts: 1 },
  { id: 'a3', pid: 'pA', dueDate: daysAgo(15), status: 'SCHEDULED', attempts: 0 },
];

// pE: one overdue open step that is also unreachable (attempts >= threshold).
const pESteps: MetricStep[] = [{ id: 'e1', pid: 'pE', dueDate: daysAgo(10), status: 'SCHEDULED', attempts: 5 }];

describe('TC-MET-008 — §13 patients needing attention counts distinct patients, not steps (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is 2, not 4 — pE counts once despite having both an overdue and an unreachable qualifying step', () => {
    const threshold = 3;
    const result = patientsNeedingAttention([...pASteps, ...pESteps], threshold);

    expect(result).toBe(2);
  });
});
