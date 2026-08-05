// ITEM-7-AI-INSIGHTS.md AI-1, AI-2, AI-6, AI-8 (batches 7a — intent
// extraction, 7b — execution and grounding).
//
// AI-1: the pipeline is question -> [model] -> structured intent, then
// intent -> [§13 functions] -> computed metrics, then figures -> [model] ->
// narration. The stages stay separate: intent extraction below never calls
// a §13 function from logic.ts, execution below never calls the model, and
// narration validation only ever sees already-computed figures.
//
// AI-8: the model call is injectable. This module defines the ModelClient
// interface the engine depends on; a real provider adapter is a later batch.

import {
  completionRate,
  onTimeCompletionRate,
  medianDaysToCompletion,
  overdueBuckets,
  patientsNeedingAttention,
  unreachablePatients,
  upcomingLoad,
  referralCompletionRateBySpecialty,
  type RateResult,
  type MedianDaysResult,
  type OverdueBuckets,
  type UpcomingLoad,
} from './logic';
import type { Category, Id, StepStatus } from './types';

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

// ITEM-7-AI-INSIGHTS.md AI-1 (batch 7b — execution and grounding).
//
// This stage is the opposite of intent extraction: it must never call the
// model. It takes the intent extraction already produced and turns it into
// a computed metric by calling the existing §13 function in logic.ts —
// never reimplementing or recomputing the formula — so the chat answer and
// the dashboard can never diverge on the same fixture.

/** Coordination-state shape execution needs; a superset of what any one §13 function requires. */
export interface InsightsStep {
  id: Id;
  pid: Id;
  cat: Category;
  specialty?: string;
  dueDate: Date;
  visitDate?: Date;
  status: StepStatus;
  completedDate?: Date | null;
  attempts: number;
}

/** Whichever §13 function backed the intent returns its own result shape verbatim — never wrapped or re-derived. */
export type ExecutedMetric =
  | RateResult
  | MedianDaysResult
  | OverdueBuckets
  | UpcomingLoad
  | Record<string, RateResult>
  | number
  | null;

/** ITEM-7-AI-INSIGHTS.md AI-1 — intent -> [§13 functions] -> computed metrics. Never calls the model. */
export function executeIntent(intent: AiIntent, steps: InsightsStep[], now: Date = new Date()): ExecutedMetric {
  const scoped = intent.category ? steps.filter((s) => s.cat === intent.category) : steps;
  const periodDays = intent.periodDays ?? 30;

  switch (intent.type) {
    case 'COMPLETION_RATE':
      return completionRate(scoped, periodDays, now);
    case 'ON_TIME_RATE':
      return onTimeCompletionRate(scoped, periodDays, now);
    case 'MEDIAN_DAYS_TO_COMPLETION':
      return medianDaysToCompletion(
        scoped.map((s) => ({ ...s, visitDate: s.visitDate ?? s.dueDate })),
        periodDays,
        now,
      );
    case 'OVERDUE_BACKLOG':
      return overdueBuckets(scoped, now);
    case 'PATIENTS_NEEDING_ATTENTION':
      return patientsNeedingAttention(scoped, undefined, now);
    case 'UNREACHABLE_PATIENTS':
      return unreachablePatients(scoped);
    case 'UPCOMING_LOAD':
      return upcomingLoad(scoped, now);
    case 'REFERRAL_COMPLETION':
      return referralCompletionRateBySpecialty(
        scoped.map((s) => ({ ...s, specialty: s.specialty ?? s.cat })),
        periodDays,
        now,
      );
    case 'UNSUPPORTED':
      return null;
    default:
      return null;
  }
}

// ITEM-7-AI-INSIGHTS.md AI-6 (batch 7b — grounding).

/** ITEM-7-AI-INSIGHTS.md AI-6 — the structured provenance every response carries so a figure is traceable, not just stated. */
export interface AiResponseGrounding {
  metric: AiIntentType;
  periodDays?: number;
  numerator?: number;
  denominator?: number;
  clause: string;
}

/** §13 clause each intent's figure derives from — cited on every grounded response (AI-6). */
const AI_INTENT_CLAUSES: Record<AiIntentType, string> = {
  COMPLETION_RATE: '§13 completion rate',
  ON_TIME_RATE: '§13 on-time completion rate',
  MEDIAN_DAYS_TO_COMPLETION: '§13 median days to completion',
  OVERDUE_BACKLOG: '§13 overdue buckets',
  PATIENTS_NEEDING_ATTENTION: '§13 patients needing attention',
  UNREACHABLE_PATIENTS: '§13, §10.5 unreachable patients',
  UPCOMING_LOAD: '§13 upcoming load',
  REFERRAL_COMPLETION: '§13, BR-019 referral completion rate',
  UNSUPPORTED: 'no §13 function executed',
};

function isRateResult(value: ExecutedMetric): value is RateResult {
  return (
    typeof value === 'object' && value !== null && 'numerator' in value && 'denominator' in value && 'rate' in value
  );
}

/** ITEM-7-AI-INSIGHTS.md AI-6 — assembles the grounding record from the intent and the value `executeIntent` returned. */
export function assembleResponse(intent: AiIntent, executed: ExecutedMetric): AiResponseGrounding {
  const grounding: AiResponseGrounding = {
    metric: intent.type,
    clause: AI_INTENT_CLAUSES[intent.type],
  };
  if (intent.periodDays !== undefined) grounding.periodDays = intent.periodDays;
  if (isRateResult(executed)) {
    grounding.numerator = executed.numerator;
    grounding.denominator = executed.denominator;
  }
  return grounding;
}

// ITEM-7-AI-INSIGHTS.md AI-1 (batch 7b — narration validation).

/** ITEM-7-AI-INSIGHTS.md AI-1 — the verdict on whether a model's narration stayed within the computed figures. */
export interface NarrationValidation {
  valid: boolean;
  invalidNumerals: number[];
}

/**
 * ITEM-7-AI-INSIGHTS.md AI-1 — every numeral in a model's narration must
 * appear in the computed metric set. A narration inserting any other
 * numeral (however plausible) fails validation and must never be rendered.
 */
export function validateNarration(narration: string, computedNumerals: number[]): NarrationValidation {
  const allowed = new Set(computedNumerals);
  const found = narration.match(/\d+(\.\d+)?/g) ?? [];
  const numerals = found.map(Number);
  const invalidNumerals = [...new Set(numerals.filter((n) => !allowed.has(n)))];
  return { valid: invalidNumerals.length === 0, invalidNumerals };
}
