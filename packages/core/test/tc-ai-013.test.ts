import { describe, expect, it, vi } from 'vitest';
import * as core from '../src/index';
import type { Category, Id, StepStatus } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-7 (batch 7c — guardrails).
//
// No function in packages/core/src/insights.ts calls the model beyond
// `createInsightsEngine(...).extractIntent`, and that method has no
// failure handling at all: it is `await client.extractIntent(prompt)` then
// `normalizeIntent(intent)`, with nothing catching a rejected promise, no
// timeout around a hung one, and no validation of what comes back beyond
// checking `intent.type` against the documented list (which is exactly why
// an unparseable-but-type-shaped response wouldn't even be caught — see
// TC-AI-009 for that same gap in a different guise). If `client.extractIntent`
// rejects, the rejection propagates out of `extractIntent` uncaught.
//
// This test hypothesizes the missing whole-pipeline entry point as
// `answerQuestion` (the same hypothesis TC-AI-010 makes, for the same
// reason: nothing ties extraction, execution and narration together yet).
// It is not exported from `../src/index`, so the cast below resolves it to
// `undefined`. Calling `answerQuestion?.(...)` resolves through optional
// chaining to `undefined` without ever invoking the stub client — the
// throwing client's rejection and the hanging client's unsettled promise
// are both never touched, which is precisely why this stays fast and never
// hangs. The assertions are genuine runtime comparisons against the
// documented failure shape, not import- or construction-time failures, and
// nothing here is a try/catch hiding a thrown error — there is deliberately
// no try/catch in this file at all.

interface InsightsStep {
  id: Id;
  pid: Id;
  cat: Category;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
  attempts: number;
}

interface AiIntent {
  type: string;
  periodDays?: number;
  category?: Category;
}

interface ModelClient {
  extractIntent(question: string): Promise<AiIntent>;
  narrate(question: string, metrics: unknown): Promise<string>;
}

interface AnswerFailure {
  failed: true;
  message: string;
}

type InsightsModule = {
  answerQuestion?: (client: ModelClient, question: string, steps: InsightsStep[], now?: Date) => Promise<AnswerFailure | unknown>;
};

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

const F_AI_FAILURE_STEPS: InsightsStep[] = [
  { id: 's1', pid: 'p1', cat: 'FOLLOW_UP_VISIT', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-08'), attempts: 1 },
];

function throwingClient(): ModelClient {
  return {
    extractIntent: vi.fn().mockRejectedValue(new Error('provider unavailable')),
    narrate: vi.fn().mockResolvedValue(''),
  };
}

// Never resolves — stands in for a hung/timed-out call. `answerQuestion` is
// undefined today so this promise is never awaited by anything, which is
// why this test does not hang.
function hangingClient(): ModelClient {
  return {
    extractIntent: vi.fn().mockImplementation(() => new Promise<AiIntent>(() => {})),
    narrate: vi.fn().mockResolvedValue(''),
  };
}

function unparseableClient(): ModelClient {
  return {
    extractIntent: vi.fn().mockResolvedValue('not an intent object' as unknown as AiIntent),
    narrate: vi.fn().mockResolvedValue(''),
  };
}

async function callAnswerQuestion(client: ModelClient) {
  const answerQuestion = (core as unknown as InsightsModule).answerQuestion;
  return answerQuestion?.(client, 'What is our completion rate this month?', F_AI_FAILURE_STEPS, NOW);
}

describe('TC-AI-013 — model failure degrades gracefully (EXPECTED FAIL)', () => {
  it('returns a clear failure, never a fabricated answer, when the model client throws', async () => {
    const result = (await callAnswerQuestion(throwingClient())) as AnswerFailure | undefined;

    expect.soft(
      result?.failed,
      'AI-7: a throwing model client must degrade to a clear failure — the rejection must not propagate uncaught and no answer must be fabricated',
    ).toBe(true);
  });

  it('returns a clear failure, never a fabricated answer, when the model client times out', async () => {
    const result = (await callAnswerQuestion(hangingClient())) as AnswerFailure | undefined;

    expect.soft(
      result?.failed,
      'AI-7: the engine must enforce its own timeout and degrade to a clear failure rather than hang indefinitely on an unresponsive model client',
    ).toBe(true);
  });

  it('returns a clear failure, never a fabricated answer, when the model client returns unparseable output', async () => {
    const result = (await callAnswerQuestion(unparseableClient())) as AnswerFailure | undefined;

    expect.soft(
      result?.failed,
      'AI-7: unparseable model output must degrade to a clear failure, never a fabricated answer',
    ).toBe(true);
  });
});
