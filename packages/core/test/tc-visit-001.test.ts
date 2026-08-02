import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §10.2/§10.3 require every Next Step to carry a `visitId` anchoring it to
// exactly one Visit (BR-006), and one visit to hold multiple independent
// Next Steps (BR-004). Neither the Visit entity nor a `visitId` field exists
// on WorkStep today, and `recordVisit(patientId, steps)` returns
// Promise<void> — it hands back no identifiers at all for what it created.
// The signature below is written against what BR-004/BR-006 require: the
// call must return the created visit's id and the created steps' ids so a
// caller can verify the invariant. Extra arguments/fields beyond the real
// `recordVisit(patientId, steps)` are ignored by JS at the call site (no
// crash), but the real method's `void` return means `result` below is
// `undefined` — the first line of each test is expected to throw on that.
interface VisitOptions {
  doctorId: Id;
  createdBy: Id;
}

interface StepCaptureInput {
  cat: Category;
  /** Real engine still keys off `dueKey`; included so this call doesn't also fail on that. */
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  dueDate: Date;
  priority: Priority;
}

interface RecordVisitResult {
  visitId: Id;
  stepIds: Id[];
}

type RecordVisitRequired = (
  patientId: Id,
  steps: StepCaptureInput[],
  options: VisitOptions,
) => Promise<RecordVisitResult>;

function threeSteps(): StepCaptureInput[] {
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  return [
    { cat: 'FOLLOW_UP_VISIT', dueKey: '1w', dueDate, priority: 'NORMAL' },
    { cat: 'LAB_INVESTIGATION', dueKey: '1w', dueDate, priority: 'NORMAL' },
    { cat: 'OTHER', dueKey: '1w', dueDate, priority: 'NORMAL' },
  ];
}

describe('TC-VISIT-001 — BR-004, BR-006 one visit, many steps, independent lifecycles (EXPECTED FAIL)', () => {
  it('assigns the same visitId to every step captured in one visit and a distinct nextStepId to each', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };

    const result = await call.recordVisit('p1', threeSteps(), { doctorId: 'doc1', createdBy: 'admin1' });

    expect(result.stepIds).toHaveLength(3);
    expect(new Set(result.stepIds).size).toBe(3);

    const steps = await Promise.all(result.stepIds.map((id) => engine.getStep(id)));
    const visitIds = steps.map((s) => (s as unknown as { visitId?: Id } | undefined)?.visitId);
    expect(visitIds.every((v) => v !== undefined && v === result.visitId)).toBe(true);
  });

  it('completing one step leaves the other two at their prior status with unchanged due dates', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };

    const result = await call.recordVisit('p1', threeSteps(), { doctorId: 'doc1', createdBy: 'admin1' });
    const [completedId, otherId1, otherId2] = result.stepIds;

    const before = await Promise.all(
      [otherId1, otherId2].map((id) => engine.getStep(id)),
    );

    await engine.completeStep(completedId);

    const after = await Promise.all(
      [otherId1, otherId2].map((id) => engine.getStep(id)),
    );

    expect(after[0]?.status).toBe(before[0]?.status);
    expect(after[0]?.due).toBe(before[0]?.due);
    expect(after[1]?.status).toBe(before[1]?.status);
    expect(after[1]?.due).toBe(before[1]?.due);
  });
});
