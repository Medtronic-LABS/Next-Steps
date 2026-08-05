import { describe, expect, it } from 'vitest';
import * as core from '../src/index';
import { completionRate } from '../src/logic';
import type { Category, Id, StepStatus } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-1 (batch 7b — execution and grounding).
// No execution stage exists in packages/core/src/insights.ts yet: it exports
// only `createInsightsEngine`, whose engine has `extractIntent` and nothing
// that turns an intent into a computed metric. `executeIntent` is not
// exported from `../src/index`. The cast below adds the AI-1 shape — a
// standalone function that runs intent -> [§13 functions] -> computed
// metrics, taking no model client because this stage never touches the
// model — that the real module doesn't provide, so `executeIntent` is
// `undefined` here and the call resolves through optional chaining to
// `undefined`, never throwing. The `toEqual` below is a genuine runtime
// assertion against the §13 function's own return value on the same
// fixture, not an import- or construction-time failure, and nothing here is
// a try/catch hiding a thrown error.
//
// This test's reading of the (currently nonexistent) API: `executeIntent`
// takes the same `(steps, periodDays, now)` shape that `completionRate`
// itself takes, plus the intent, and for a COMPLETION_RATE intent returns
// exactly what `completionRate` returns — not a wrapped or re-derived
// value. AI-1's requirement is that execution *delegates*, so the returned
// value must be `toEqual`-identical to the direct call, not merely
// consistent with it.

type AiIntentType =
  | 'COMPLETION_RATE'
  | 'ON_TIME_RATE'
  | 'MEDIAN_DAYS_TO_COMPLETION'
  | 'OVERDUE_BACKLOG'
  | 'PATIENTS_NEEDING_ATTENTION'
  | 'UNREACHABLE_PATIENTS'
  | 'UPCOMING_LOAD'
  | 'REFERRAL_COMPLETION'
  | 'UNSUPPORTED';

interface AiIntent {
  type: AiIntentType;
  periodDays?: number;
  category?: Category;
}

interface MetricStep {
  id: Id;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

type InsightsModule = {
  executeIntent?: (intent: AiIntent, steps: MetricStep[], now?: Date) => unknown;
};

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

// Same fixture shape as TC-MET-001: 50% (2 of 4) — m1/m2 in the numerator,
// m1/m2/m3/m5 in the denominator, m4 (cancelled) and m6 (outside period)
// excluded. TC-AI-008 reuses this same known figure for its narration check.
const F_AI_EXEC: MetricStep[] = [
  { id: 'm1', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-08') },
  { id: 'm2', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-14') },
  { id: 'm3', dueDate: d('2026-06-12'), status: 'DECLINED' },
  { id: 'm4', dueDate: d('2026-06-12'), status: 'CANCELLED' },
  { id: 'm5', dueDate: d('2026-06-15'), status: 'SCHEDULED' },
  { id: 'm6', dueDate: d('2026-05-01'), status: 'SCHEDULED' },
];

describe('TC-AI-006 — execution matches the function called directly (EXPECTED FAIL)', () => {
  it('produces a value identical to calling completionRate directly on the same fixture', () => {
    const intent: AiIntent = { type: 'COMPLETION_RATE', periodDays: 30 };
    const directResult = completionRate(F_AI_EXEC, 30, NOW);

    const executeIntent = (core as unknown as InsightsModule).executeIntent;
    const executed = executeIntent?.(intent, F_AI_EXEC, NOW);

    expect(
      executed,
      'AI-1: executing a COMPLETION_RATE intent must delegate to completionRate and return its exact value — not a recomputed or re-derived figure that could diverge from the dashboard',
    ).toEqual(directResult);
  });
});
