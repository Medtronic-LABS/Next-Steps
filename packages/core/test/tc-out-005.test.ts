import { describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// PRD §17 — "CCE unavailability must never block clinic operations"
// (ITEM-5-TEST-CASES.md TC-OUT-005). This is the single most important case
// in the item: it is the concept note's resilience claim expressed as a
// test. A synchronous dispatch inside the transition — one whose rejection
// is allowed to propagate out of `completeStep` — would make an unreachable
// CCE stop the clinic working, which §17 forbids outright. No dispatcher, no
// outbox, and no internal catch of a dispatch failure exists anywhere in
// `../src/inMemoryEngine` today: `completeStep` doesn't know what a
// dispatcher is. The dispatcher is injected through a constructor options
// bag the real class doesn't accept and silently ignores (construction never
// throws), so every failure below is a named runtime assertion on the
// engine's actual observable behaviour — not an import- or construction-time
// one, and not a try/catch swallowing a real failure: `.resolves` is a
// genuine assertion that the promise settles by resolving, not by rejecting.
type EventType = 'CREATED' | 'STATUS_CHANGED' | 'COMPLETED' | 'CANCELLED';
type DispatchStatus = 'PENDING' | 'DISPATCHED' | 'FAILED' | 'STUBBED';

interface CloudEventEnvelope {
  id: string;
  source: string;
  specversion: string;
  type: string;
  subject: string;
  datacontenttype: string;
  data: unknown;
}

interface CoordinationEvent {
  eventId: Id;
  nextStepId: Id;
  eventType: EventType;
  payload: CloudEventEnvelope;
  dispatchStatus: DispatchStatus;
}

interface Dispatcher {
  send(envelope: CloudEventEnvelope): Promise<void>;
}

interface EngineOptions {
  dispatcher?: Dispatcher;
  dispatcherMode?: 'stub' | 'live';
}

type EngineWithDispatch = InMemoryCoordinationEngine & { getOutbox?: () => CoordinationEvent[] };
type EngineCtor = new (options?: EngineOptions) => EngineWithDispatch;

describe('TC-OUT-005 — a dispatch failure never blocks the clinic (EXPECTED FAIL)', () => {
  it('completing a step succeeds, reaches COMPLETED, and leaves a retryable event, even when every dispatch attempt fails', async () => {
    const send = vi.fn<Dispatcher['send']>().mockRejectedValue(new Error('CCE unreachable'));
    const alwaysFailingDispatcher: Dispatcher = { send };

    const Engine = InMemoryCoordinationEngine as unknown as EngineCtor;
    const engine = new Engine({ dispatcher: alwaysFailingDispatcher, dispatcherMode: 'live' });

    const { stepIds } = await engine.recordVisit('p-out-005', [
      { cat: 'SPECIALIST_REFERRAL', dueKey: '1w', priority: 'HIGH' },
    ]);
    const stepId = stepIds[0];

    // The load-bearing assertion: completion must resolve, never reject, no
    // matter how the dispatcher behaves. This is a real assertion on promise
    // settlement, not a try/catch hiding a thrown error.
    await expect(
      engine.completeStep(stepId),
      'a dispatcher that fails on every attempt must never surface an error to the caller completing a step',
    ).resolves.toBeUndefined();

    const step = await engine.getStep(stepId);
    expect(step?.status, 'the step must still reach COMPLETED despite the CCE being unreachable').toBe('COMPLETED');

    const outbox = engine.getOutbox?.() ?? [];
    const event = outbox.find((e) => e.nextStepId === stepId && e.eventType === 'COMPLETED');

    expect(event, 'the COMPLETED event must still be written even though dispatch failed').toBeDefined();
    expect(
      event?.dispatchStatus,
      'a failed dispatch must leave the event in a retryable state, not silently mark it delivered',
    ).toBe('FAILED');
    expect(event?.dispatchStatus).not.toBe('DISPATCHED');
  });
});
