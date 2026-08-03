import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §11.1: isOverdue = dueDate < today AND status is not terminal — the rule
// has two clauses and the second (terminal status) is easy to omit. Without
// it, completed/cancelled/declined work stays on the overdue backlog
// forever. `dueDate` is included on the capture input below so the call
// doesn't also fail on the real recordVisit's BR-005 dueKey validation
// (matches tc-visit-001.test.ts); the real engine ignores it.
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
const DUE_1_JUNE = new Date('2026-06-01T12:00:00.000Z');

async function threeStepsDueOn1June(engine: InMemoryCoordinationEngine): Promise<Id[]> {
  const call = engine as unknown as { recordVisit: RecordVisitFn };
  const { stepIds } = await call.recordVisit(
    'p1',
    [
      { cat: 'OTHER', dueKey: '1w', dueDate: DUE_1_JUNE, priority: 'NORMAL' },
      { cat: 'OTHER', dueKey: '1w', dueDate: DUE_1_JUNE, priority: 'NORMAL' },
      { cat: 'OTHER', dueKey: '1w', dueDate: DUE_1_JUNE, priority: 'NORMAL' },
    ],
    { doctorId: 'doc1', createdBy: 'admin1' },
  );
  return stepIds;
}

describe('TC-OVER-002 — §11.1 terminal steps are never overdue (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a COMPLETED step due 1 June is not overdue on 20 June', async () => {
    const engine = new InMemoryCoordinationEngine();
    const [completedId] = await threeStepsDueOn1June(engine);

    await engine.completeStep(completedId);

    const step = (await engine.getStep(completedId)) as unknown as OverdueFields;
    expect(step.isOverdue).toBe(false);
    expect(step.daysOverdue).toBe(0);
  });

  it('a CANCELLED step due 1 June is not overdue on 20 June', async () => {
    const engine = new InMemoryCoordinationEngine();
    const [, cancelledId] = await threeStepsDueOn1June(engine);

    await engine.cancelStep(cancelledId, 'Entered in error');

    const step = (await engine.getStep(cancelledId)) as unknown as OverdueFields;
    expect(step.isOverdue).toBe(false);
    expect(step.daysOverdue).toBe(0);
  });

  it('a DECLINED step due 1 June is not overdue on 20 June', async () => {
    const engine = new InMemoryCoordinationEngine();
    const [, , declinedId] = await threeStepsDueOn1June(engine);

    await engine.declineStep(declinedId, 'Patient declined');

    const step = (await engine.getStep(declinedId)) as unknown as OverdueFields;
    expect(step.isOverdue).toBe(false);
    expect(step.daysOverdue).toBe(0);
  });
});
