import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// PRD §10.5 (ITEM-5-TEST-CASES.md TC-OUT-003). Marking an event dispatched at
// write time would make a failed send invisible and the event would never be
// retried — so a freshly written event, before any dispatch attempt has run
// against it, must read back as PENDING. No outbox exists in
// `../src/inMemoryEngine` (see tc-out-001.test.ts): capture writes a WorkStep
// and commits, nothing else. `getOutbox` is read through optional chaining
// off the real, statically-imported `InMemoryCoordinationEngine` class, so
// the failure surfaces at the named assertion below rather than at import
// time.
type EventType = 'CREATED' | 'STATUS_CHANGED' | 'COMPLETED' | 'CANCELLED';
type DispatchStatus = 'PENDING' | 'DISPATCHED' | 'FAILED' | 'STUBBED';

interface CoordinationEvent {
  eventId: Id;
  nextStepId: Id;
  eventType: EventType;
  payload: unknown;
  dispatchStatus: DispatchStatus;
}

type EngineWithOutbox = InMemoryCoordinationEngine & { getOutbox?: () => CoordinationEvent[] };

describe('TC-OUT-003 — events start pending (EXPECTED FAIL)', () => {
  it('a newly written event, read before any dispatcher has run against it, has dispatchStatus PENDING', async () => {
    // No dispatcher is configured at all here — this is deliberately the
    // plainest possible write, so the only thing under test is the initial
    // state a freshly appended event is read back with.
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithOutbox;

    const { stepIds } = await engine.recordVisit('p-out-003', [
      { cat: 'SPECIALIST_REFERRAL', dueKey: '2w', priority: 'HIGH' },
    ]);
    const stepId = stepIds[0];

    const outbox = engine.getOutbox?.() ?? [];
    const event = outbox.find((e) => e.nextStepId === stepId);

    expect(event, 'capture must have written a CoordinationEvent for this step').toBeDefined();
    expect(event?.dispatchStatus, 'a freshly written event must read back as PENDING, not already dispatched').toBe(
      'PENDING',
    );
  });
});
