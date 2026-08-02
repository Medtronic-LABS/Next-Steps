import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §10.3/BR-007 require completedDate and completedBy to be set on completion
// and immutable thereafter — distinct from TC-LIFE-003, which checks that the
// step's *status* is protected from a second terminal transition. A guard
// that returns early on status without ever having written the completion
// fields would still pass TC-LIFE-003 while failing this case. The real
// completeStep(id) takes no date/actor argument and never sets any completion
// field — it only flips a private `completed` boolean (see
// tc-life-003.test.ts) — so neither the initial set nor its immutability can
// be observed today. The signature below is written against what §10.3
// requires. "Today" is pinned with vi.setSystemTime so completion is attempted
// on a fixed 15 June / 16 June boundary.
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

type CompleteStepRequired = (id: Id, completedDate?: Date, completedBy?: Id) => Promise<void>;

const VISIT_DATE = new Date('2026-06-01T09:00:00.000Z');
const FIRST_COMPLETION = new Date('2026-06-15T10:00:00.000Z');
const SECOND_ATTEMPT = new Date('2026-06-16T10:00:00.000Z');

describe('TC-COMP-001 — §10.3, BR-007 completion fields set and immutable (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets completedDate/completedBy on first completion and rejects a second, leaving them unchanged', async () => {
    vi.setSystemTime(VISIT_DATE);
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired; completeStep: CompleteStepRequired };

    const { stepIds } = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1', visitDateTime: VISIT_DATE },
    );
    const stepId = stepIds[0];

    vi.setSystemTime(FIRST_COMPLETION);
    await call.completeStep(stepId, FIRST_COMPLETION, 'admin1');

    const afterFirst = await engine.getStep(stepId);
    expect(afterFirst?.status).toBe('COMPLETED');
    expect((afterFirst as unknown as { completedDate?: Date })?.completedDate?.getTime()).toBe(
      FIRST_COMPLETION.getTime(),
    );
    expect((afterFirst as unknown as { completedBy?: Id })?.completedBy).toBe('admin1');

    vi.setSystemTime(SECOND_ATTEMPT);
    await expect(call.completeStep(stepId, SECOND_ATTEMPT, 'admin1')).rejects.toThrow(/already completed|terminal/i);

    const afterSecond = await engine.getStep(stepId);
    expect((afterSecond as unknown as { completedDate?: Date })?.completedDate?.getTime()).toBe(
      FIRST_COMPLETION.getTime(),
    );
  });
});
