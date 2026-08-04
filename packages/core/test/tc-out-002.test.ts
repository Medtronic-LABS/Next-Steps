import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// PRD §10.5, §17 (ITEM-5-TEST-CASES.md TC-OUT-002). §10.5's CoordinationEvent
// enumerates eventType as CREATED | STATUS_CHANGED | COMPLETED | CANCELLED —
// DECLINED is not its own type, so per §17's event-emission list a decline
// must surface as STATUS_CHANGED, the same as any other status change that
// isn't one of the three named outcomes. No outbox exists in
// `../src/inMemoryEngine` (see tc-out-001.test.ts), so `getOutbox` is read
// through optional chaining off the real, statically-imported
// `InMemoryCoordinationEngine` class — this defers every failure to the
// named assertions below rather than to import time.
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

describe('TC-OUT-002 — event types map to lifecycle changes (EXPECTED FAIL)', () => {
  it('capture, completion, cancellation and decline each produce the type matching their target state', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithOutbox;

    const capture = (patientId: string) =>
      engine.recordVisit(patientId, [{ cat: 'FOLLOW_UP_CALL', dueKey: '1w', priority: 'NORMAL' }]);

    const { stepIds: capturedIds } = await capture('p-out-002-created');
    const createdStepId = capturedIds[0];

    const { stepIds: completedIds } = await capture('p-out-002-completed');
    const completedStepId = completedIds[0];
    await engine.completeStep(completedStepId);

    const { stepIds: cancelledIds } = await capture('p-out-002-cancelled');
    const cancelledStepId = cancelledIds[0];
    await engine.cancelStep(cancelledStepId, 'Patient no longer needs this referral');

    const { stepIds: declinedIds } = await capture('p-out-002-declined');
    const declinedStepId = declinedIds[0];
    await engine.declineStep(declinedStepId, 'Patient declined');

    const outbox = engine.getOutbox?.() ?? [];
    const eventTypeFor = (stepId: Id, type: EventType) =>
      outbox.find((e) => e.nextStepId === stepId && e.eventType === type);

    expect(eventTypeFor(createdStepId, 'CREATED'), 'capture must produce a CREATED event').toBeDefined();
    expect(eventTypeFor(completedStepId, 'COMPLETED'), 'completion must produce a COMPLETED event').toBeDefined();
    expect(eventTypeFor(cancelledStepId, 'CANCELLED'), 'cancellation must produce a CANCELLED event').toBeDefined();
    expect(
      eventTypeFor(declinedStepId, 'STATUS_CHANGED'),
      'decline must produce a STATUS_CHANGED event — DECLINED has no eventType of its own in §10.5',
    ).toBeDefined();
  });
});
