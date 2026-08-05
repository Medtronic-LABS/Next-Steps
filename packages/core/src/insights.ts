// ITEM-7-AI-INSIGHTS.md AI-1, AI-2, AI-8 (batch 7a — intent extraction).
//
// AI-1: the pipeline is question -> [model] -> structured intent, then
// intent -> [§13 functions] -> computed metrics, then figures -> [model] ->
// narration. This module builds ONLY the first stage: it must never call a
// §13 function from packages/core/src/logic.ts.
//
// AI-8: the model call is injectable. This module defines the ModelClient
// interface the engine depends on; a real provider adapter is a later batch.

import type { Category } from './types';

/** ITEM-7-AI-INSIGHTS.md AI-2 — the exact supported intent set. Anything else is UNSUPPORTED. */
export const AI_INTENT_TYPES = [
  'COMPLETION_RATE',
  'ON_TIME_RATE',
  'MEDIAN_DAYS_TO_COMPLETION',
  'OVERDUE_BACKLOG',
  'PATIENTS_NEEDING_ATTENTION',
  'UNREACHABLE_PATIENTS',
  'UPCOMING_LOAD',
  'REFERRAL_COMPLETION',
  'UNSUPPORTED',
] as const;

export type AiIntentType = (typeof AI_INTENT_TYPES)[number];

/** ITEM-7-AI-INSIGHTS.md AI-2 — periodDays is 7, 30 or 90; comparePeriodDays is the second period of a comparison question. */
export interface AiIntent {
  type: AiIntentType;
  periodDays?: number;
  comparePeriodDays?: number;
  category?: Category;
}

/** ITEM-7-AI-INSIGHTS.md AI-8 — injectable so tests substitute a stub; no test in this item calls a network. */
export interface ModelClient {
  extractIntent(prompt: string): Promise<AiIntent>;
  narrate(question: string, metrics: unknown): Promise<string>;
}

export interface InsightsEngine {
  extractIntent(question: string): Promise<AiIntent>;
}

/** ITEM-7-AI-INSIGHTS.md AI-1 — instructs the model to return intent only, never a figure. */
const INTENT_EXTRACTION_INSTRUCTIONS = `You translate a programme leader's question about care-coordination
into a structured intent. You never compute or state a figure yourself —
return intent only.

Respond with exactly one intent type from this list:
${AI_INTENT_TYPES.join(', ')}

- COMPLETION_RATE, ON_TIME_RATE, MEDIAN_DAYS_TO_COMPLETION, OVERDUE_BACKLOG,
  UPCOMING_LOAD and REFERRAL_COMPLETION may carry a periodDays of 7, 30 or 90.
- PATIENTS_NEEDING_ATTENTION and UNREACHABLE_PATIENTS are snapshot metrics
  and must never carry a periodDays.
- A comparison between two periods carries both periodDays and
  comparePeriodDays on the same intent.
- Any metric may carry a category when the question scopes to one of the
  next-step categories (e.g. specialist referrals).
- If the question asks about clinical content, a named individual patient,
  a named individual specialist, geography, or anything else this data
  model cannot answer, respond with UNSUPPORTED. Do not approximate with
  the closest-sounding supported metric.`;

function buildIntentExtractionPrompt(question: string): string {
  return `${INTENT_EXTRACTION_INSTRUCTIONS}\n\nQuestion: ${question}`;
}

function normalizeIntent(intent: AiIntent | null | undefined): AiIntent {
  if (!intent || !(AI_INTENT_TYPES as readonly string[]).includes(intent.type)) {
    return { type: 'UNSUPPORTED' };
  }
  return intent;
}

/** ITEM-7-AI-INSIGHTS.md AI-8 — engine built from an injectable model client. */
export function createInsightsEngine(client: ModelClient): InsightsEngine {
  return {
    async extractIntent(question: string): Promise<AiIntent> {
      const prompt = buildIntentExtractionPrompt(question);
      const intent = await client.extractIntent(prompt);
      return normalizeIntent(intent);
    },
  };
}
