import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// FR-A-7.1/§11.2 bound the completion date on both sides: it cannot precede
// the anchoring visit's date, and it cannot be in the future. The real
// completeStep(id) takes no date argument at all — it unconditionally flips a
// private `completed` boolean (see tc-life-003.test.ts) — so neither bound
// can be violated or observed today. The signature below is written against
// what FR-A-7.1 requires. "Today" is pinned with vi.setSystemTime so the
// fixture dates (9/10/20/21 June) map onto a fixed boundary instead of the
// real wall-clock date.
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

type CompleteStepRequired = (id: Id, completedDate: Date) => Promise<void>;

const TODAY = new Date('2026-06-20T12:00:00.000Z');
const VISIT_DATE = new Date('2026-06-10T09:00:00.000Z');

async function stepFromVisit(): Promise<{ engine: InMemoryCoordinationEngine; stepId: Id }> {
  const engine = new InMemoryCoordinationEngine();
  const call = engine as unknown as { recordVisit: RecordVisitRequired };
  const { stepIds } = await call.recordVisit(
    'p1',
    [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }],
    { doctorId: 'doc1', createdBy: 'admin1', visitDateTime: VISIT_DATE },
  );
  return { engine, stepId: stepIds[0] };
}

describe('TC-LIFE-004 — FR-A-7.1, §11.2 completion date bounds (EXPECTED FAIL)', () => {
  beforeEach(() => {
    // shouldAdvanceTime keeps the engine's internal setTimeout-based delay()
    // resolving in real time while Date.now()/new Date() stay pinned to TODAY.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects completion dated before the visit (9 June)', async () => {
    const { engine, stepId } = await stepFromVisit();
    const call = engine as unknown as { completeStep: CompleteStepRequired };

    await expect(call.completeStep(stepId, new Date('2026-06-09T12:00:00.000Z'))).rejects.toThrow(
      /before the visit/i,
    );
  });

  it('accepts completion dated on the visit date (10 June)', async () => {
    const { engine, stepId } = await stepFromVisit();
    const call = engine as unknown as { completeStep: CompleteStepRequired };

    await call.completeStep(stepId, new Date('2026-06-10T12:00:00.000Z'));

    const step = await engine.getStep(stepId);
    expect(step?.status).toBe('COMPLETED');
  });

  it('accepts completion dated today (20 June)', async () => {
    const { engine, stepId } = await stepFromVisit();
    const call = engine as unknown as { completeStep: CompleteStepRequired };

    await call.completeStep(stepId, new Date('2026-06-20T12:00:00.000Z'));

    const step = await engine.getStep(stepId);
    expect(step?.status).toBe('COMPLETED');
  });

  it('rejects completion dated in the future (21 June)', async () => {
    const { engine, stepId } = await stepFromVisit();
    const call = engine as unknown as { completeStep: CompleteStepRequired };

    await expect(call.completeStep(stepId, new Date('2026-06-21T12:00:00.000Z'))).rejects.toThrow(/future/i);
  });
});
