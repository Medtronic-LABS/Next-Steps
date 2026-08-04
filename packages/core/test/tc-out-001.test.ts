import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// PRD §10.5, §11.2 (ITEM-5-TEST-CASES.md TC-OUT-001). §10.5 defines
// CoordinationEvent — {eventId, nextStepId, eventType, payload,
// dispatchStatus} — as the CCE outbox; §17 requires the backend to write one
// on every Next Step lifecycle change. No outbox exists anywhere in
// `../src/inMemoryEngine` today: `completeStep`/`cancelStep`/etc. mutate the
// step and commit to localStorage, nothing else. `InMemoryCoordinationEngine`
// itself exists and is imported statically (that class is real), but
// `getOutbox` is not one of its methods, so accessing it is `undefined` at
// runtime rather than a missing-export syntax error at import time. Reading
// through optional chaining defers every failure to the named assertions
// below, exactly as TC-ID-003 through TC-ID-005 and TC-CE-002 already do for
// their own not-yet-built functions.
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

const REQUIRED_FIELDS = ['eventId', 'nextStepId', 'eventType', 'payload', 'dispatchStatus'] as const;

describe('TC-OUT-001 — every transition writes exactly one event; a rejected transition writes none (EXPECTED FAIL)', () => {
  it('a successful transition grows the outbox by exactly one fully-formed event; a transition rejected by §11.2 leaves it unchanged', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithOutbox;

    const { stepIds } = await engine.recordVisit('p-out-001', [
      { cat: 'FOLLOW_UP_CALL', dueKey: '1w', priority: 'NORMAL' },
    ]);
    const stepId = stepIds[0];

    const outboxAfterCapture = engine.getOutbox?.() ?? [];
    const eventsAfterCapture = outboxAfterCapture.filter((e) => e.nextStepId === stepId);
    expect(eventsAfterCapture, 'capturing a Next Step must write exactly one event').toHaveLength(1);
    for (const field of REQUIRED_FIELDS) {
      expect(eventsAfterCapture[0]?.[field], `the event written by capture must carry ${field}`).toBeDefined();
    }
    expect(eventsAfterCapture[0]?.eventType, 'capture must write a CREATED event').toBe('CREATED');

    await engine.completeStep(stepId);

    const outboxAfterCompletion = engine.getOutbox?.() ?? [];
    const eventsAfterCompletion = outboxAfterCompletion.filter((e) => e.nextStepId === stepId);
    expect(eventsAfterCompletion, 'completing the step must grow the outbox by exactly one event').toHaveLength(2);
    for (const field of REQUIRED_FIELDS) {
      expect(eventsAfterCompletion[1]?.[field], `the event written by completion must carry ${field}`).toBeDefined();
    }
    expect(eventsAfterCompletion[1]?.eventType, 'completion must write a COMPLETED event').toBe('COMPLETED');

    const outboxLengthAfterSuccess = outboxAfterCompletion.length;

    // BR-013: cancelling without a reason is a real, existing rejection in
    // the current engine (inMemoryEngine.ts's cancelStep throws when the
    // reason is blank) — a genuine rejected transition, not a hand-waved one.
    await expect(engine.cancelStep(stepId, ''), 'BR-013: cancelling without a reason must be rejected').rejects.toThrow();

    const outboxAfterRejection = engine.getOutbox?.() ?? [];
    expect(
      outboxAfterRejection,
      'a transition rejected by validation must write no event — the outbox length must be unchanged from the value after the last successful transition',
    ).toHaveLength(outboxLengthAfterSuccess);
  });
});
