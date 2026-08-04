import { describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// PRD §17, §21.2 (ITEM-5-TEST-CASES.md TC-OUT-004). §17: "for the pilot the
// adapter can run in stub mode (events logged, not dispatched), switchable
// by configuration." §21.2 states stub mode doesn't affect evaluation of the
// core hypothesis — which only holds if the event payload is still complete
// and inspectable even though nothing was sent over the network. No
// dispatcher, stub mode, or outbox exists anywhere in
// `../src/inMemoryEngine` today: `completeStep` takes no such configuration
// and makes no network call of any kind, stubbed or otherwise. The
// dispatcher and its `send` are injected through a constructor options bag
// this engine doesn't accept — the real constructor takes no arguments and
// silently ignores whatever is passed, so construction itself never throws;
// every failure below is a named runtime assertion, not an import- or
// construction-time one.
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

describe('TC-OUT-004 — stub mode does not dispatch (EXPECTED FAIL)', () => {
  it('completing a step in stub mode writes a fully formed event and never calls the dispatcher', async () => {
    const send = vi.fn<Dispatcher['send']>().mockResolvedValue(undefined);
    const dispatcher: Dispatcher = { send };

    const Engine = InMemoryCoordinationEngine as unknown as EngineCtor;
    const engine = new Engine({ dispatcher, dispatcherMode: 'stub' });

    const { stepIds } = await engine.recordVisit('p-out-004', [
      { cat: 'FOLLOW_UP_VISIT', dueKey: '1m', priority: 'NORMAL' },
    ]);
    const stepId = stepIds[0];
    await engine.completeStep(stepId);

    expect(send, 'stub mode must never attempt a network call to the dispatcher').not.toHaveBeenCalled();

    const outbox = engine.getOutbox?.() ?? [];
    const event = outbox.find((e) => e.nextStepId === stepId && e.eventType === 'COMPLETED');

    expect(event, 'completion must still write a COMPLETED event even in stub mode').toBeDefined();
    expect(event?.payload?.data, 'the payload must be fully formed and inspectable, not a placeholder').toBeDefined();
    expect(event?.payload?.subject, 'the payload must carry a non-blank subject').toBeTruthy();

    expect(
      event?.dispatchStatus,
      'stub mode must mark the event with a status distinct from both PENDING and DISPATCHED',
    ).toBe('STUBBED');
    expect(event?.dispatchStatus).not.toBe('PENDING');
    expect(event?.dispatchStatus).not.toBe('DISPATCHED');
  });
});
