import { describe, expect, it, vi } from 'vitest';
import * as core from '../src/index';
import type { Category } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-3, BR-017 (batch 7c — guardrails).
//
// Unlike the 7a/7b fixtures, `createInsightsEngine` is real and exported —
// batch 7a already implemented it. This test does not hypothesize a missing
// function; it exercises the real one against a real gap in its behaviour.
// `extractIntent` in packages/core/src/insights.ts is:
//
//   const intent = await client.extractIntent(prompt);
//   return normalizeIntent(intent);
//
// `normalizeIntent` only checks that `intent.type` is one of the documented
// AI_INTENT_TYPES — it has no independent notion of "this question was
// clinical" or "this question named a patient." AI-3 says "the engine
// declines" a clinical or patient-level question; nothing in the engine
// does that. The prompt instructs the model to self-classify such
// questions as UNSUPPORTED, but the engine applies no check of its own, so
// a model that ignores or misreads the instructions — the failure mode any
// third-party model call must be defended against — carries its wrong
// answer straight through.
//
// The stubbed clients below simulate exactly that: for each clinical
// question they return a normal, well-formed, computable intent (as if the
// model had ignored the "respond with UNSUPPORTED" instruction). If the
// engine had its own refusal logic, the returned intent would still come
// back UNSUPPORTED regardless of what the model said. It does not, so this
// genuinely fails today — a real runtime comparison against real output,
// not an import- or construction-time failure, and nothing here is a
// try/catch hiding a thrown error.

interface AiIntent {
  type: string;
  periodDays?: number;
  category?: Category;
}

interface ModelClient {
  extractIntent(question: string): Promise<AiIntent>;
  narrate(question: string, metrics: unknown): Promise<string>;
}

interface InsightsEngine {
  extractIntent(question: string): Promise<AiIntent>;
}

type InsightsModule = { createInsightsEngine: (client: ModelClient) => InsightsEngine };

function adversarialClient(wrongIntent: AiIntent): ModelClient {
  return {
    extractIntent: vi.fn().mockResolvedValue(wrongIntent),
    narrate: vi.fn().mockResolvedValue(''),
  };
}

const CLINICAL_QUESTIONS: Array<{ question: string; modelAnswer: AiIntent }> = [
  { question: 'Does this patient have pre-eclampsia?', modelAnswer: { type: 'COMPLETION_RATE', periodDays: 30 } },
  { question: 'What should we prescribe?', modelAnswer: { type: 'ON_TIME_RATE', periodDays: 30 } },
  { question: 'Is her anaemia severe?', modelAnswer: { type: 'OVERDUE_BACKLOG' } },
];

describe('TC-AI-009 — clinical questions are refused (EXPECTED FAIL)', () => {
  it('refuses every clinical question regardless of what the model itself returns', async () => {
    const { createInsightsEngine } = core as unknown as InsightsModule;

    for (const { question, modelAnswer } of CLINICAL_QUESTIONS) {
      const client = adversarialClient(modelAnswer);
      const engine = createInsightsEngine(client);
      const intent = await engine.extractIntent(question);

      expect.soft(
        intent.type,
        `AI-3, BR-017: "${question}" is clinical content — the engine must decline it itself and never surface the model's own guess ("${modelAnswer.type}"), because clinical decision support is a different regulatory category entirely`,
      ).toBe('UNSUPPORTED');
    }
  });
});
