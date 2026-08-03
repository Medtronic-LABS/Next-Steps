import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §11.1: isOverdue = dueDate < today AND status is not terminal. "Due today"
// must not read as overdue — an off-by-one here inflates the overdue
// backlog by a full day's steps every day. Nothing today computes
// isOverdue/daysOverdue at all (WorkStep.over is a frozen integer set once
// at capture, always 0 for a freshly recorded step), so this is written
// against what §11.1 requires. `dueDate` is included on the capture input
// below so the call doesn't also fail on the real recordVisit's BR-005
// dueKey validation (matches tc-visit-001.test.ts); the real engine ignores it.
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

const TODAY = new Date('2026-06-20T12:00:00.000Z');
const DUE_19_JUNE = new Date('2026-06-19T12:00:00.000Z');
const DUE_20_JUNE = new Date('2026-06-20T12:00:00.000Z');
const DUE_21_JUNE = new Date('2026-06-21T12:00:00.000Z');

describe('TC-OVER-001 — §11.1 overdue boundary (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('due yesterday (19 June) is overdue by 1 day; due today and due tomorrow are not overdue', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_19_JUNE, priority: 'NORMAL' },
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_20_JUNE, priority: 'NORMAL' },
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_21_JUNE, priority: 'NORMAL' },
      ],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const [id19, id20, id21] = stepIds;

    const step19 = (await engine.getStep(id19)) as unknown as OverdueFields;
    const step20 = (await engine.getStep(id20)) as unknown as OverdueFields;
    const step21 = (await engine.getStep(id21)) as unknown as OverdueFields;

    expect(step19.isOverdue, 'due 19 June should be overdue').toBe(true);
    expect(step19.daysOverdue, 'due 19 June should be 1 day overdue').toBe(1);

    expect(step20.isOverdue, 'due today (20 June) must not be overdue').toBe(false);
    expect(step20.daysOverdue).toBe(0);

    expect(step21.isOverdue, 'due tomorrow (21 June) must not be overdue').toBe(false);
    expect(step21.daysOverdue).toBe(0);
  });
});
