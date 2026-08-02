import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, StepStatus, WorkStep } from '../src/types';

// §11.2's transition table lists CREATED -> SCHEDULED as automatic ("Reminder
// engine schedules reminders on sync/save"), and §11.4 requires every
// transition — this one included — to append a history entry. The real
// engine never produces a CREATED-status step at all: recordVisit creates
// steps directly as SCHEDULED (see tc-visit-001.test.ts), and there is no
// method corresponding to the CREATED -> SCHEDULED trigger. To exercise the
// legal path this case exists to guard (its point is that TC-LIFE-003's
// illegal-transition guard must not also block this one), a CREATED step is
// inserted directly into the engine's private `state.createdSteps` — reached
// by cast, since `private` is a compile-time-only marker and this file isn't
// type-checked (see tc-life-001.test.ts) — because no public method can
// produce that starting state today. `scheduleStep` is called against the
// shape §11.2/§11.4 require; the real engine has no such method, so this is
// expected to fail on the missing capability itself, the same way
// TC-LIFE-001 does for cancelStep's reason parameter.
interface HistoryEntry {
  at: Date;
  byUser: Id;
  fromStatus: StepStatus | null;
  toStatus: StepStatus;
}

interface EngineInternals {
  state: { createdSteps: WorkStep[] };
  scheduleStep: (id: Id, byUser?: Id) => Promise<void>;
}

function createdStep(id: Id): WorkStep {
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
  };
}

describe('TC-LIFE-005 — §11.2 CREATED to SCHEDULED is legal (EXPECTED FAIL)', () => {
  it('accepts the transition and appends a CREATED -> SCHEDULED history entry', async () => {
    const engine = new InMemoryCoordinationEngine();
    const internals = engine as unknown as EngineInternals;
    const id = 'created-step-1';
    internals.state.createdSteps.push(createdStep(id));

    await internals.scheduleStep(id, 'admin1');

    const step = await engine.getStep(id);
    expect(step?.status).toBe('SCHEDULED');

    const history = (step as unknown as { history?: HistoryEntry[] } | undefined)?.history ?? [];
    const entry = history.find((h) => h.fromStatus === 'CREATED' && h.toStatus === 'SCHEDULED');
    expect(entry, 'expected a CREATED -> SCHEDULED history entry').toBeDefined();
  });
});
