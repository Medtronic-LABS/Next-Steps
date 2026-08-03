import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §11.1: daysOverdue counts whole calendar days between the due date and
// today in clinic time, not elapsed hours divided by 24. Millisecond
// subtraction plus Math.floor understates the backlog whenever the due
// timestamp's time-of-day is later than "now"'s time-of-day, which is
// exactly this case: only 10 hours have elapsed, but a calendar day has
// turned over in clinic (IST) time. `dueDate` is included on the capture
// input below so the call doesn't also fail on the real recordVisit's
// BR-005 dueKey validation (matches tc-visit-001.test.ts); the real engine
// ignores it.
interface StepCaptureInput {
  cat: Category;
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  dueDate: Date;
  priority: Priority;
}

type RecordVisitFn = (
  patientId: Id,
  steps: StepCaptureInput[],
  options?: { doctorId?: Id; createdBy?: Id },
) => Promise<{ stepIds: Id[] }>;

interface OverdueFields {
  isOverdue?: boolean;
  daysOverdue?: number;
}

// 19 June 23:00 IST.
const DUE_19_JUNE_2300_IST = new Date('2026-06-19T17:30:00.000Z');
// 20 June 09:00 IST — only 10 hours after the due timestamp above.
const NOW_20_JUNE_0900_IST = new Date('2026-06-20T03:30:00.000Z');

describe('TC-OVER-005 — §11.1 daysOverdue counts calendar days, not elapsed hours (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW_20_JUNE_0900_IST);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a step due 19 June 23:00 IST is 1 day overdue at 20 June 09:00 IST, not 0', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', dueDate: DUE_19_JUNE_2300_IST, priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );

    const step = (await engine.getStep(stepIds[0])) as unknown as OverdueFields;

    expect(step.isOverdue).toBe(true);
    expect(
      step.daysOverdue,
      'only 10 elapsed hours, but one clinic calendar day has passed — must be 1, not 0',
    ).toBe(1);
  });
});
