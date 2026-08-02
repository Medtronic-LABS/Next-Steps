import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// FR-A-7.3/BR-007/§11.2 require reopening a completed step within 48 hours to
// restore SCHEDULED and clear completedDate/completedBy, and to reject it
// outside the window. The real engine has no `reopenStep` method at all —
// completeStep/cancelStep/declineStep only ever move a step forward into a
// terminal state by flipping private booleans (see tc-life-003.test.ts) — so
// COMPLETED -> SCHEDULED, the one exception §11.2's transition table allows,
// cannot be exercised. The signature below is written against what
// FR-A-7.3 requires.
//
// PROVISIONAL — open question per ITEM-2-TEST-CASES.md: §11.2 and FR-A-7.3
// both say "within 48 hours" without stating whether the boundary itself is
// inclusive. Pending a PRD ruling, this file implements T+48:00:00 exactly as
// ACCEPTED (inclusive). Do not let an implementation silently decide this
// either way without that ruling.
interface VisitOptions {
  doctorId: Id;
  createdBy: Id;
  visitDateTime?: Date;
}

interface StepCaptureInput {
  cat: Category;
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  priority: Priority;
}

type RecordVisitRequired = (
  patientId: Id,
  steps: StepCaptureInput[],
  options: VisitOptions,
) => Promise<{ stepIds: Id[] }>;

type CompleteStepRequired = (id: Id, completedDate?: Date) => Promise<void>;
type ReopenStepRequired = (id: Id) => Promise<void>;

const T = new Date('2026-06-15T10:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

async function completedStepAtT(): Promise<{ engine: InMemoryCoordinationEngine; stepId: Id }> {
  vi.setSystemTime(T);
  const engine = new InMemoryCoordinationEngine();
  const call = engine as unknown as { recordVisit: RecordVisitRequired; completeStep: CompleteStepRequired };
  const { stepIds } = await call.recordVisit(
    'p1',
    [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }],
    { doctorId: 'doc1', createdBy: 'admin1', visitDateTime: T },
  );
  await call.completeStep(stepIds[0], T);
  return { engine, stepId: stepIds[0] };
}

describe('TC-LIFE-006 — FR-A-7.3, BR-007 reopen within 48 hours (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts reopen at T+47:59:59, restoring SCHEDULED and clearing completion fields', async () => {
    const { engine, stepId } = await completedStepAtT();
    const call = engine as unknown as { reopenStep: ReopenStepRequired };

    vi.setSystemTime(new Date(T.getTime() + 48 * HOUR_MS - 1000));
    await call.reopenStep(stepId);

    const step = await engine.getStep(stepId);
    expect(step?.status).toBe('SCHEDULED');
    expect((step as unknown as { completedDate?: Date | null })?.completedDate ?? null).toBeNull();
    expect((step as unknown as { completedBy?: Id | null })?.completedBy ?? null).toBeNull();

    const history = (step as unknown as { history?: { fromStatus: string; toStatus: string }[] } | undefined)
      ?.history ?? [];
    expect(history.some((h) => h.fromStatus === 'COMPLETED' && h.toStatus === 'SCHEDULED')).toBe(true);
  });

  it('PROVISIONAL — accepts reopen at exactly T+48:00:00, pending a PRD ruling on inclusivity', async () => {
    const { engine, stepId } = await completedStepAtT();
    const call = engine as unknown as { reopenStep: ReopenStepRequired };

    vi.setSystemTime(new Date(T.getTime() + 48 * HOUR_MS));
    await call.reopenStep(stepId);

    const step = await engine.getStep(stepId);
    expect(step?.status).toBe('SCHEDULED');
  });

  it('rejects reopen at T+48:00:01, leaving the step COMPLETED', async () => {
    const { engine, stepId } = await completedStepAtT();
    const call = engine as unknown as { reopenStep: ReopenStepRequired };

    vi.setSystemTime(new Date(T.getTime() + 48 * HOUR_MS + 1000));
    await expect(call.reopenStep(stepId)).rejects.toThrow(/48 hours|reopen window/i);

    const step = await engine.getStep(stepId);
    expect(step?.status).toBe('COMPLETED');
  });
});
