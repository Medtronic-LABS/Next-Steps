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

// ITEM-7-AI-INSIGHTS.md AI-3, BR-017 (batch 7c — guardrails).
//
// The prompt above instructs the model to self-classify clinical and
// patient-level questions as UNSUPPORTED, but AI-3 requires the *engine* to
// decline them. A model that ignores or misreads its instructions must never
// carry a wrong answer through, so this check runs before the model is
// called at all — no model response can override it.

const CLINICAL_KEYWORDS = [
  'pre-eclampsia',
  'preeclampsia',
  'eclampsia',
  'prescribe',
  'prescription',
  'anaemia',
  'anemia',
  'diagnos',
  'symptom',
  'treatment',
  'medication',
  'dosage',
  'lab result',
  'vitals',
  'blood pressure',
  'hemoglobin',
  'haemoglobin',
  'disease',
  'illness',
  'clinical',
  'pregnan',
  'infection',
];

/** Two consecutive capitalised words read as a named individual (e.g. "Sunita Rao") — AI-3 answers at aggregate level only. */
const NAMED_INDIVIDUAL_PATTERN = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/;

/** ITEM-7-AI-INSIGHTS.md AI-3 — clinical and patient-level questions are declined before the model is ever consulted. */
function isRefusedQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  if (CLINICAL_KEYWORDS.some((keyword) => lower.includes(keyword))) return true;
  return NAMED_INDIVIDUAL_PATTERN.test(question);
}

/** ITEM-7-AI-INSIGHTS.md AI-8 — engine built from an injectable model client. */
export function createInsightsEngine(client: ModelClient): InsightsEngine {
  return {
    async extractIntent(question: string): Promise<AiIntent> {
      if (isRefusedQuestion(question)) return { type: 'UNSUPPORTED' };
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

// ITEM-7-AI-INSIGHTS.md AI-5, §3.3 (batch 7c — guardrails).

/** ITEM-7-AI-INSIGHTS.md AI-5 — the verdict on whether a narration frames a metric as a person's performance. */
export interface FramingValidation {
  valid: boolean;
  violations?: string[];
}

const PERFORMANCE_LANGUAGE = /\b(worklist|performance|workload|caseload)\b/i;
const POSSESSIVE_PRONOUNS = /\b(her|his|their)\b/i;

/** Common words a care-journey sentence opens on ("38 next steps...", "Overall completion...") — anything else capitalised is likely a name. */
const COMMON_SENTENCE_STARTS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'there',
  'overall', 'in', 'on', 'at', 'no', 'only', 'both', 'all', 'most', 'some',
  'total', 'care', 'next', 'patients', 'patient', 'across', 'over', 'among',
  'of', 'more', 'fewer', 'current', 'currently', 'completion', 'as',
  'since', 'with', 'out', 'number', 'is', 'was', 'up', 'down',
]);

function opensOnNamedSubject(sentence: string): boolean {
  const first = sentence.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '');
  if (!first || !/^[A-Z][a-z]+$/.test(first)) return false;
  return !COMMON_SENTENCE_STARTS.has(first.toLowerCase());
}

/**
 * ITEM-7-AI-INSIGHTS.md AI-5 — rejects narration that attributes a metric to
 * a named individual as personal performance. Per §3.3 the subject of every
 * metric is the patient's care, never a person's performance.
 */
export function validateFraming(narration: string): FramingValidation {
  const violations: string[] = [];
  for (const sentence of narration.split(/(?<=[.!?])\s+/)) {
    if (!sentence.trim()) continue;
    const performanceFraming = PERFORMANCE_LANGUAGE.test(sentence) || POSSESSIVE_PRONOUNS.test(sentence);
    if (opensOnNamedSubject(sentence) && performanceFraming) {
      violations.push(`attributes a metric to a named individual: "${sentence.trim()}"`);
    }
  }
  return violations.length === 0 ? { valid: true } : { valid: false, violations };
}

// ITEM-7-AI-INSIGHTS.md AI-3 (batch 7c — guardrails).

/**
 * ITEM-7-AI-INSIGHTS.md AI-3 — the plain-language message for an UNSUPPORTED
 * intent: states the question cannot be answered and what is available,
 * with no figures, so a leader is not left with nothing.
 */
export function unsupportedNarration(): string {
  return (
    'This question cannot be answered from the data available today. ' +
    'Next Steps can answer questions about completion rate, on-time completion, ' +
    'median days to completion, overdue backlog, patients needing attention, ' +
    'unreachable patients, upcoming load, and referral completion by specialty.'
  );
}

// ITEM-7-AI-INSIGHTS.md AI-4, AI-7 (batch 7c — guardrails).
//
// This is the pipeline's remaining stage: question -> intent -> execute ->
// narrate, wired together. AI-4 is enforced here, at the point the payload
// to `narrate` is constructed, not left to convention: only the summarized
// §13 result and the intent's own scoping fields are ever included, never a
// step or patient row. AI-7 wraps every model call in a timeout and never
// lets a rejected, hung or unparseable call propagate or fabricate a figure.

/** ITEM-7-AI-INSIGHTS.md AI-7 — a clear, structured failure. Never a fabricated answer. */
export interface AnswerFailure {
  failed: true;
  message: string;
}

export interface AnswerSuccess {
  failed: false;
  narration: string;
  grounding: AiResponseGrounding;
}

export type AnswerResult = AnswerFailure | AnswerSuccess;

/** Placeholder budget for a prototype model call; a deployed proxy would tune this against real provider latency. */
const MODEL_CALL_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

function isPlausibleIntentShape(value: unknown): value is AiIntent {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function isOverdueBuckets(value: ExecutedMetric): value is OverdueBuckets {
  return typeof value === 'object' && value !== null && '1-7' in value && '8-30' in value && '31-90' in value && '90+' in value;
}

/** ITEM-7-AI-INSIGHTS.md AI-4 — collapses raw §13 step-id buckets to counts; only aggregate figures ever reach a payload. */
function summarizeForNarration(executed: ExecutedMetric): unknown {
  if (isOverdueBuckets(executed)) {
    return {
      '1-7': executed['1-7'].length,
      '8-30': executed['8-30'].length,
      '31-90': executed['31-90'].length,
      '90+': executed['90+'].length,
    };
  }
  return executed;
}

function collectNumerals(value: unknown): number[] {
  const numerals: number[] = [];
  const visit = (v: unknown) => {
    if (typeof v === 'number') numerals.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(value);
  return numerals;
}

/**
 * ITEM-7-AI-INSIGHTS.md AI-1, AI-3, AI-4, AI-7 — the whole pipeline: refuse,
 * extract, execute, narrate, validate. `patientsOrNow` accepts either the
 * clinic's patient list (accepted but never read — patients never factor
 * into a §13 computation or a model payload, only steps do) followed by
 * `now`, or `now` directly, so callers may omit the patient list entirely.
 */
export async function answerQuestion(
  client: ModelClient,
  question: string,
  steps: InsightsStep[],
  patientsOrNow?: unknown[] | Date,
  maybeNow?: Date,
): Promise<AnswerResult> {
  const now = patientsOrNow instanceof Date ? patientsOrNow : (maybeNow ?? new Date());

  if (isRefusedQuestion(question)) {
    return { failed: false, narration: unsupportedNarration(), grounding: assembleResponse({ type: 'UNSUPPORTED' }, null) };
  }

  let rawIntent: unknown;
  try {
    rawIntent = await withTimeout(
      client.extractIntent(buildIntentExtractionPrompt(question)),
      MODEL_CALL_TIMEOUT_MS,
      'intent extraction',
    );
  } catch {
    return { failed: true, message: 'The model could not be reached. Please try again.' };
  }

  if (!isPlausibleIntentShape(rawIntent)) {
    return { failed: true, message: 'The model returned a response that could not be parsed.' };
  }

  const intent = normalizeIntent(rawIntent);

  if (intent.type === 'UNSUPPORTED') {
    return { failed: false, narration: unsupportedNarration(), grounding: assembleResponse(intent, null) };
  }

  const executed = executeIntent(intent, steps, now);
  const summarized = summarizeForNarration(executed);
  const payload = { metric: intent.type, periodDays: intent.periodDays, category: intent.category, result: summarized };

  let narration: string;
  try {
    narration = await withTimeout(client.narrate(question, payload), MODEL_CALL_TIMEOUT_MS, 'narration');
  } catch {
    return { failed: true, message: 'The model could not be reached. Please try again.' };
  }

  const numeralCheck = validateNarration(narration, collectNumerals(summarized));
  const framingCheck = validateFraming(narration);

  if (!numeralCheck.valid || !framingCheck.valid) {
    return { failed: true, message: 'The model response could not be validated and was discarded.' };
  }

  return { failed: false, narration, grounding: assembleResponse(intent, executed) };
}
