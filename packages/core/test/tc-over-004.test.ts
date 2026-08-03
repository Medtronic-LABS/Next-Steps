import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §10/§10.5: the clinic's calendar-day boundary follows its timezone
// (default Asia/Kolkata), not UTC. Item 2's dayStart() helper
// (inMemoryEngine.ts) uses Date.UTC, so between 18:30 and 24:00 IST every
// day, UTC is still on the previous calendar date — a step due "20 June"
// must already read as overdue once the clinic's clock has rolled into 21
// June, even though the UTC date has not. `dueDate` is included on the
// capture input below so the call doesn't also fail on the real
// recordVisit's BR-005 dueKey validation (matches tc-visit-001.test.ts); the
// real engine ignores it.
//
// Cross-check once fixed: TC-LIFE-004 (completion date bounds) uses the same
// dayStart() helper and must still pass.
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

// Noon IST on 20 June — an unambiguous instant within the clinic's 20 June.
const DUE_20_JUNE_IST = new Date('2026-06-20T06:30:00.000Z');
// 2026-06-20T20:30:00Z = 2026-06-21T02:00 IST: UTC calendar date is still 20
// June, but the clinic's calendar day has already rolled over to 21 June.
const NOW = new Date('2026-06-20T20:30:00.000Z');

describe('TC-OVER-004 — §10, §10.5 day boundaries follow clinic timezone (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a step due 20 June is overdue by 1 day once the clinic clock (IST) has rolled into 21 June, even though UTC has not', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', dueDate: DUE_20_JUNE_IST, priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );

    const step = (await engine.getStep(stepIds[0])) as unknown as OverdueFields;

    expect(step.isOverdue, 'clinic day has rolled to 21 June IST; the step is overdue').toBe(true);
    expect(step.daysOverdue).toBe(1);
  });
});
