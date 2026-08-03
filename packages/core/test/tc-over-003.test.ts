import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority, WorkStep } from '../src/types';

// §11.1/§11.3: overdue is a derived flag, recomputed on read — never stored.
// If daysOverdue were a stored integer (as WorkStep.over is today), the
// backlog would silently stop ageing between writes. This asserts both
// halves: daysOverdue keeps advancing across a pure read with the clock
// moved forward, and the persisted record is otherwise byte-identical
// before and after — i.e. no field except the derived ones changed.
// `dueDate` is included on the capture input below so the call doesn't also
// fail on the real recordVisit's BR-005 dueKey validation (matches
// tc-visit-001.test.ts); the real engine ignores it.
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

const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = new Date('2026-06-20T12:00:00.000Z');
const DUE_YESTERDAY = new Date('2026-06-19T12:00:00.000Z');

function withoutDerivedFields(step: WorkStep | undefined): Record<string, unknown> {
  const clone = { ...(step as unknown as Record<string, unknown>) };
  delete clone.isOverdue;
  delete clone.daysOverdue;
  return clone;
}

describe('TC-OVER-003 — §11.1, §11.3 overdue is derived, never stored (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('daysOverdue advances 1 -> 8 over a week with no intervening write, and no field is mutated', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', dueDate: DUE_YESTERDAY, priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const id = stepIds[0];

    const before = await engine.getStep(id);
    const beforeOverdue = before as unknown as OverdueFields;
    expect(beforeOverdue.daysOverdue, 'expected 1 day overdue on 20 June').toBe(1);
    expect(beforeOverdue.isOverdue).toBe(true);

    vi.setSystemTime(new Date(TODAY.getTime() + 7 * DAY_MS));

    const after = await engine.getStep(id);
    const afterOverdue = after as unknown as OverdueFields;
    expect(afterOverdue.daysOverdue, 'expected 8 days overdue a week later, with no write in between').toBe(8);

    expect(withoutDerivedFields(after)).toEqual(withoutDerivedFields(before));
  });
});
