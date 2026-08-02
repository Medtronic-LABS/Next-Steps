import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority, WorkStep } from '../src/types';

// BR-006 requires every Next Step, seed data included, to resolve to exactly
// one Visit. There is no public enumeration method on CoordinationEngine,
// but `InMemoryCoordinationEngine#allSteps` — the private method combining
// seed WORK with captured steps — is only `private` at the TypeScript layer;
// it is an ordinary method at runtime, and test files here aren't
// type-checked (see tc-life-001.test.ts), so it can be called through a
// cast. That is the only way to enumerate "every step" against the current
// engine, and it doubles as evidence that §10.2 needs a public equivalent.
interface StepCaptureInput {
  cat: Category;
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  priority: Priority;
}

type RecordVisitRequired = (patientId: Id, steps: StepCaptureInput[]) => Promise<unknown>;
type AllStepsAccessor = () => WorkStep[];

describe('TC-VISIT-005 — BR-006 every step belongs to exactly one visit (EXPECTED FAIL)', () => {
  it('gives every step, seed and newly captured, a single resolvable visitId', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired; allSteps: AllStepsAccessor };

    await call.recordVisit('p1', [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }]);

    const steps = call.allSteps();
    expect(steps.length).toBeGreaterThan(0);

    for (const step of steps) {
      const visitId = (step as unknown as { visitId?: Id | Id[] }).visitId;
      expect(visitId, `step ${step.id} must carry a non-null visitId`).toBeTruthy();
      expect(Array.isArray(visitId), `step ${step.id} must resolve to exactly one visit`).toBe(false);
    }
  });
});
