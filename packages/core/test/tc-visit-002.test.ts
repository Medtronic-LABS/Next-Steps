import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// BR-005/FR-A-5.2 require a due date on every Next Step, rejected when
// absent, with no orphan Visit left behind either. The real
// `recordVisit(patientId, steps)` performs no validation at all — it looks
// up `DUE[s.dueKey].date` unconditionally, so a step with no due date
// crashes the loop with a TypeError instead of a deliberate rejection, and
// there is no Visit store (not even a private one) to ask about orphan
// visits: any call to a visit-count accessor throws because the accessor
// doesn't exist. Both are read here as failures of the required behavior,
// not as passes for the wrong reason. The rejection assertion now matches
// on a due-date message so it distinguishes a deliberate validation
// rejection from a crash.
interface StepCaptureNoDueDate {
  cat: Category;
  priority: Priority;
}

type RecordVisitRequired = (patientId: Id, steps: StepCaptureNoDueDate[]) => Promise<{ visitId: Id }>;

// Required per §10.2: a way to confirm no orphan Visit was persisted after a
// rejected capture. No such accessor exists anywhere on the engine today.
type VisitCounter = () => Promise<number>;

const CATEGORIES: Category[] = [
  'FOLLOW_UP_VISIT',
  'LAB_INVESTIGATION',
  'SPECIALIST_REFERRAL',
  'FOLLOW_UP_CALL',
  'OTHER',
];

describe('TC-VISIT-002 — BR-005, FR-A-5.2 due date mandatory (EXPECTED FAIL)', () => {
  it('rejects a step saved with no due date, for every category, without persisting it', async () => {
    for (const cat of CATEGORIES) {
      const engine = new InMemoryCoordinationEngine();
      const call = engine as unknown as { recordVisit: RecordVisitRequired };

      const before = await engine.openStepsForPatient('p1');

      await expect(call.recordVisit('p1', [{ cat, priority: 'NORMAL' }])).rejects.toThrow(/due date/i);

      const after = await engine.openStepsForPatient('p1');
      expect(after.length).toBe(before.length);
    }
  });

  it('does not persist an orphan visit when the step save is rejected', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired; visitCount: VisitCounter };

    const before = await call.visitCount();
    await expect(call.recordVisit('p1', [{ cat: 'OTHER', priority: 'NORMAL' }])).rejects.toThrow();
    const after = await call.visitCount();

    expect(after).toBe(before);
  });
});
