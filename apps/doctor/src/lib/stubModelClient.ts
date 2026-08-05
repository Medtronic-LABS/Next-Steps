// ITEM-7-AI-INSIGHTS.md AI-8: a stubbed ModelClient wiring the Insights tab
// to `answerQuestion` (@next-steps/core) ahead of a real provider adapter.
// Deterministic keyword matching stands in for both model calls — nothing
// here reaches a network, and it never invents a figure: `narrate` only ever
// reads numbers already present in the computed payload it's handed.

import type { AiIntent, Category, ModelClient } from '@next-steps/core';

function questionText(prompt: string): string {
  const marker = 'Question:';
  const idx = prompt.lastIndexOf(marker);
  return (idx === -1 ? prompt : prompt.slice(idx + marker.length)).trim().toLowerCase();
}

function detectPeriodDays(q: string): number | undefined {
  if (/\b7\b|\bweek\b/.test(q)) return 7;
  if (/\b90\b|\bquarter\b/.test(q)) return 90;
  if (/\b30\b|\bmonth\b/.test(q)) return 30;
  return undefined;
}

function detectCategory(q: string): Category | undefined {
  if (/lab|investigation/.test(q)) return 'LAB_INVESTIGATION';
  if (/follow.?up call|\bcalls?\b/.test(q)) return 'FOLLOW_UP_CALL';
  if (/follow.?up visit/.test(q)) return 'FOLLOW_UP_VISIT';
  return undefined;
}

const RULES: { test: RegExp; build: (q: string) => AiIntent }[] = [
  { test: /on.?time/, build: (q) => ({ type: 'ON_TIME_RATE', periodDays: detectPeriodDays(q) ?? 30, category: detectCategory(q) }) },
  { test: /median|how long|days to complet/, build: (q) => ({ type: 'MEDIAN_DAYS_TO_COMPLETION', periodDays: detectPeriodDays(q) ?? 30, category: detectCategory(q) }) },
  { test: /overdue|backlog/, build: () => ({ type: 'OVERDUE_BACKLOG' }) },
  { test: /need(s|ing)? attention/, build: () => ({ type: 'PATIENTS_NEEDING_ATTENTION' }) },
  { test: /unreachable/, build: () => ({ type: 'UNREACHABLE_PATIENTS' }) },
  { test: /upcoming|coming up|next (two )?weeks/, build: () => ({ type: 'UPCOMING_LOAD' }) },
  { test: /referral.*specialty|specialty.*referral/, build: (q) => ({ type: 'REFERRAL_COMPLETION', periodDays: detectPeriodDays(q) ?? 30, category: 'SPECIALIST_REFERRAL' }) },
  { test: /referral/, build: (q) => ({ type: 'COMPLETION_RATE', periodDays: detectPeriodDays(q) ?? 30, category: 'SPECIALIST_REFERRAL' }) },
  { test: /complet/, build: (q) => ({ type: 'COMPLETION_RATE', periodDays: detectPeriodDays(q) ?? 30, category: detectCategory(q) }) },
];

function extractIntent(prompt: string): AiIntent {
  const q = questionText(prompt);
  const rule = RULES.find((r) => r.test.test(q));
  return rule ? rule.build(q) : { type: 'UNSUPPORTED' };
}

/** Words, never digits — periodDays is a query parameter, not a computed figure, so it must never surface as a numeral. */
function periodPhrase(periodDays?: number): string {
  if (periodDays === 7) return ' over the last week';
  if (periodDays === 30) return ' over the last month';
  if (periodDays === 90) return ' over the last quarter';
  return '';
}

function isRateResult(v: unknown): v is { numerator: number; denominator: number; rate: number } {
  return typeof v === 'object' && v !== null && 'numerator' in v && 'denominator' in v && 'rate' in v;
}

interface NarrationPayload {
  metric: string;
  periodDays?: number;
  category?: Category;
  result: unknown;
}

/** ITEM-7-AI-INSIGHTS.md AI-1, AI-5: narrates only the figures already computed, in care-journey language. */
function narrate(payload: NarrationPayload): string {
  const { metric, periodDays, result } = payload;

  if (metric === 'COMPLETION_RATE' && isRateResult(result)) {
    return `${result.rate}% of next steps${periodPhrase(periodDays)} reached completion — ${result.numerator} of ${result.denominator}.`;
  }
  if (metric === 'ON_TIME_RATE' && isRateResult(result)) {
    return `${result.rate}% of next steps${periodPhrase(periodDays)} were completed on time — ${result.numerator} of ${result.denominator}.`;
  }
  if (metric === 'MEDIAN_DAYS_TO_COMPLETION') {
    const overall = (result as { overall?: number } | null)?.overall;
    if (typeof overall === 'number') {
      return `Next steps${periodPhrase(periodDays)} took a median of ${overall} days to reach completion.`;
    }
  }
  if (metric === 'OVERDUE_BACKLOG') {
    const buckets = (result ?? {}) as Record<string, number>;
    const b1 = buckets['1-7'] ?? 0;
    const b2 = buckets['8-30'] ?? 0;
    const b3 = buckets['31-90'] ?? 0;
    const b4 = buckets['90+'] ?? 0;
    // No overall total is stated: it would be a sum computed here, not a figure present in the metrics.
    return `Next steps overdue: ${b1} for 1–7 days, ${b2} for 8–30 days, ${b3} for 31–90 days, and ${b4} beyond 90 days.`;
  }
  if (metric === 'PATIENTS_NEEDING_ATTENTION' && typeof result === 'number') {
    return `${result} patients currently need attention — an overdue or unreachable next step.`;
  }
  if (metric === 'UNREACHABLE_PATIENTS' && typeof result === 'number') {
    return `${result} patients are currently unreachable on an open next step.`;
  }
  if (metric === 'UPCOMING_LOAD') {
    const total = (result as { total?: number } | null)?.total;
    if (typeof total === 'number') {
      return `${total} next steps are due over the next two weeks.`;
    }
  }
  if (metric === 'REFERRAL_COMPLETION') {
    const bySpecialty = (result ?? {}) as Record<string, { rate: number; numerator: number; denominator: number }>;
    const parts = Object.entries(bySpecialty).map(([specialty, r]) => `${specialty} ${r.rate}% (${r.numerator} of ${r.denominator})`);
    if (parts.length > 0) {
      return `Referral completion${periodPhrase(periodDays)} by specialty: ${parts.join(', ')}.`;
    }
  }
  return 'The computed figures could not be narrated.';
}

/** Deterministic stand-in for a real provider adapter (a later batch, per ITEM-7-AI-INSIGHTS.md). */
export function createStubModelClient(): ModelClient {
  return {
    async extractIntent(prompt: string): Promise<AiIntent> {
      return extractIntent(prompt);
    },
    async narrate(_question: string, metrics: unknown): Promise<string> {
      return narrate(metrics as NarrationPayload);
    },
  };
}
