import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, StepStatus, WorkStep } from '../src/types';

// §11.4 requires history to be append-only and never editable, including
// that a returned history array must not be a live reference into the store.
// WorkStep carries no history field at all today, so there is no history
// array a real transition could ever populate — but getStep's own retrieval
// path (`this.allSteps().find(...)`, see inMemoryEngine.ts) returns object
// references straight out of the store with no defensive copy at any level.
// That is true regardless of which field is being read, so a step fixture
// carrying a history array is inserted directly into the engine's private
// `state.createdSteps` (as in tc-life-005.test.ts) to exercise exactly that
// retrieval path: these assertions fail not by crashing on a missing field,
// but by observing the mutation leak through, which is the concrete defect
// this case exists to catch.
interface HistoryEntry {
  at: Date;
  byUser: Id;
  fromStatus: StepStatus | null;
  toStatus: StepStatus;
}

interface EngineInternals {
  state: { createdSteps: (WorkStep & { history: HistoryEntry[] })[] };
}

function stepWithHistory(id: Id, history: HistoryEntry[]): WorkStep & { history: HistoryEntry[] } {
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
    status: 'COMPLETED',
    history,
  };
}

function baseHistory(): HistoryEntry[] {
  return [
    { at: new Date('2026-06-01T09:00:00.000Z'), byUser: 'admin1', fromStatus: null, toStatus: 'CREATED' },
    { at: new Date('2026-06-01T09:01:00.000Z'), byUser: 'admin1', fromStatus: 'CREATED', toStatus: 'SCHEDULED' },
    { at: new Date('2026-06-05T10:00:00.000Z'), byUser: 'admin1', fromStatus: 'SCHEDULED', toStatus: 'COMPLETED' },
  ];
}

describe('TC-HIST-003 — §11.4 history cannot be mutated (EXPECTED FAIL)', () => {
  it('is unaffected by mutating a field on an entry in the returned array', async () => {
    const engine = new InMemoryCoordinationEngine();
    const internals = engine as unknown as EngineInternals;
    const id = 'hist-mut-1';
    internals.state.createdSteps.push(stepWithHistory(id, baseHistory()));

    const first = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    first.history[0].toStatus = 'CANCELLED';

    const after = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    expect(after.history[0].toStatus).toBe('CREATED');
  });

  it('is unaffected by deleting an entry from the returned array', async () => {
    const engine = new InMemoryCoordinationEngine();
    const internals = engine as unknown as EngineInternals;
    const id = 'hist-mut-2';
    internals.state.createdSteps.push(stepWithHistory(id, baseHistory()));

    const first = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    first.history.splice(0, 1);

    const after = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    expect(after.history).toHaveLength(3);
  });

  it('is unaffected by reordering the returned array', async () => {
    const engine = new InMemoryCoordinationEngine();
    const internals = engine as unknown as EngineInternals;
    const id = 'hist-mut-3';
    internals.state.createdSteps.push(stepWithHistory(id, baseHistory()));

    const first = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    first.history.reverse();

    const after = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    expect(after.history[0].toStatus).toBe('CREATED');
  });

  it('returns a history array that is not a live reference into the store', async () => {
    const engine = new InMemoryCoordinationEngine();
    const internals = engine as unknown as EngineInternals;
    const id = 'hist-mut-4';
    internals.state.createdSteps.push(stepWithHistory(id, baseHistory()));

    const a = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    const b = (await engine.getStep(id)) as unknown as { history: HistoryEntry[] };
    expect(a.history).not.toBe(b.history);
  });
});
