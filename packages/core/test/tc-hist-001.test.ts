import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, StepStatus, WorkStep } from '../src/types';

// §11.4 requires every transition to append an immutable history entry
// {at, byUser, fromStatus, toStatus, reason}, and §11.2's transition table has
// three transitions between "new" and COMPLETED: (new) -> CREATED,
// CREATED -> SCHEDULED, then SCHEDULED -> COMPLETED. WorkStep carries no
// history field at all today (see tc-life-003.test.ts), and there is no
// method for either of the first two transitions — recordVisit creates a
// step directly at SCHEDULED, skipping both (see tc-visit-001.test.ts). A
// CREATED step, seeded with the one history entry its own creation would have
// produced, is inserted directly into the engine's private
// `state.createdSteps` (as in tc-life-005.test.ts) so this case can exercise
// the two transitions that remain: `scheduleStep` (also required by
// TC-LIFE-005) and completeStep.
interface HistoryEntry {
  at: Date;
  byUser: Id;
  fromStatus: StepStatus | null;
  toStatus: StepStatus;
}

interface EngineInternals {
  state: { createdSteps: (WorkStep & { history: HistoryEntry[] })[] };
  scheduleStep: (id: Id, byUser?: Id) => Promise<void>;
  completeStep: (id: Id, completedDate?: Date, byUser?: Id) => Promise<void>;
}

function createdStepWithCreationHistory(id: Id): WorkStep & { history: HistoryEntry[] } {
  return {
    id,
    pid: 'p1',
    visitId: 'v1',
    name: 'Ramesh Kulkarni',
    cat: 'OTHER',
    detail: '',
    due: '1 Jul',
    over: 0,
    priority: 'NORMAL',
    delivery: '—',
    attempts: 0,
    section: 'soon',
    status: 'CREATED',
    history: [{ at: new Date('2026-06-01T09:00:00.000Z'), byUser: 'admin1', fromStatus: null, toStatus: 'CREATED' }],
  };
}

describe('TC-HIST-001 — §11.4, BR-007 history is append-only and ordered (EXPECTED FAIL)', () => {
  it('records exactly three ordered entries for CREATED -> SCHEDULED -> COMPLETED', async () => {
    const engine = new InMemoryCoordinationEngine();
    const internals = engine as unknown as EngineInternals;
    const id = 'hist-step-1';
    internals.state.createdSteps.push(createdStepWithCreationHistory(id));

    await internals.scheduleStep(id, 'admin1');
    await internals.completeStep(id, undefined, 'admin1');

    const step = await engine.getStep(id);
    const history = (step as unknown as { history?: HistoryEntry[] } | undefined)?.history ?? [];

    expect(history).toHaveLength(3);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe('CREATED');
    expect(history[1].fromStatus).toBe('CREATED');
    expect(history[1].toStatus).toBe('SCHEDULED');
    expect(history[2].fromStatus).toBe('SCHEDULED');
    expect(history[2].toStatus).toBe('COMPLETED');
    for (const entry of history) {
      expect(entry.at).toBeInstanceOf(Date);
      expect(entry.byUser).toBeTruthy();
    }
  });
});
