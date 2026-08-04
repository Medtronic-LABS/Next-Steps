import { describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// Verified cce-collector-service contract (ITEM-5-TEST-CASES.md TC-OUT-006):
// idempotency is derived from (id, source) with a 30-day lookback, so a
// fresh envelope id per retry attempt defeats deduplication entirely and
// every retry creates a duplicate commitment in the graph. No outbox, no
// dispatcher, and no retry path exists anywhere in `../src/inMemoryEngine`
// today (see tc-out-001.test.ts through tc-out-005.test.ts). The dispatcher
// and the hypothetical `retryDispatch` are both read/injected through
// constructor options and an instance method the real class doesn't have —
// the real constructor silently ignores extra arguments and the missing
// method reads as `undefined` through optional chaining, so every failure
// below is a named runtime assertion, not an import-time one.
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

type EngineWithDispatch = InMemoryCoordinationEngine & {
  getOutbox?: () => CoordinationEvent[];
  retryDispatch?: (eventId: Id) => Promise<void>;
};
type EngineCtor = new (options?: EngineOptions) => EngineWithDispatch;

describe('TC-OUT-006 — retries are idempotent (EXPECTED FAIL)', () => {
  it('retrying a failed dispatch reuses the same envelope id and source; it does not generate a fresh one', async () => {
    const send = vi.fn<Dispatcher['send']>().mockRejectedValue(new Error('CCE unreachable'));
    const alwaysFailingDispatcher: Dispatcher = { send };

    const Engine = InMemoryCoordinationEngine as unknown as EngineCtor;
    const engine = new Engine({ dispatcher: alwaysFailingDispatcher, dispatcherMode: 'live' });

    const { stepIds } = await engine.recordVisit('p-out-006', [
      { cat: 'LAB_INVESTIGATION', dueKey: '3d', priority: 'HIGH' },
    ]);
    const stepId = stepIds[0];

    // First attempt: completion writes the event and dispatch fails.
    await engine.completeStep(stepId);

    expect(send, 'the first completion must have attempted exactly one dispatch').toHaveBeenCalledTimes(1);
    const firstEnvelope = send.mock.calls[0]?.[0];
    expect(firstEnvelope?.id, 'the first dispatch attempt must carry a CloudEvents id').toBeTruthy();
    expect(firstEnvelope?.source, 'the first dispatch attempt must carry a CloudEvents source').toBeTruthy();

    const outbox = engine.getOutbox?.() ?? [];
    const event = outbox.find((e) => e.nextStepId === stepId && e.eventType === 'COMPLETED');
    expect(event, 'the COMPLETED event from the first attempt must exist before it can be retried').toBeDefined();

    // Retry: the collector dedupes on (id, source), so this must resend the
    // *same* envelope, not build a new one.
    await engine.retryDispatch?.(event?.eventId as Id);

    expect(send, 'retrying must attempt a second dispatch').toHaveBeenCalledTimes(2);
    const secondEnvelope = send.mock.calls[1]?.[0];

    expect(secondEnvelope?.id, 'a retry must reuse the first attempt\'s envelope id, not mint a new one').toBe(
      firstEnvelope?.id,
    );
    expect(
      secondEnvelope?.source,
      'a retry must reuse the first attempt\'s envelope source, not mint a new one',
    ).toBe(firstEnvelope?.source);
  });
});
