import { describe, expect, it } from 'vitest';
import * as core from '../src/index';
import { completionRate, type RateResult } from '../src/logic';
import type { Category, Id, StepStatus } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-6 (batch 7b — execution and grounding).
// No response-assembly stage exists in packages/core/src/insights.ts yet:
// it exports only `createInsightsEngine`/`AiIntent`/`ModelClient`, nothing
// that turns a computed metric into the grounded, UI-renderable structure
// AI-6 requires. `assembleResponse` is not exported from `../src/index`.
// The cast below adds the AI-6 shape — a standalone function from
// (intent, computed metric) to a grounding record — that the real module
// doesn't provide, so `assembleResponse` is `undefined` here and the call
// resolves through optional chaining to `undefined`, never throwing. The
// assertions below are genuine runtime comparisons against the documented
// grounding fields, not import- or construction-time failures, and nothing
// here is a try/catch hiding a thrown error.
//
// This test's reading of the (currently nonexistent) API:
// `assembleResponse(intent, executed)` returns `{ metric, periodDays,
// numerator, denominator, clause }`, where `metric` is the intent's type,
// `numerator`/`denominator` are lifted from the computed RateResult, and
// `clause` cites the §13 clause the figure derives from (AI-6 requires the
// clause reference to be present and traceable, not any specific string —
// this test asserts it names §13). The "successfully executed intent" AI-6
// requires as input is supplied directly here via `completionRate`, since
// TC-AI-006 is the test that covers the execution stage itself; this case
// is only about assembly.

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

interface AiResponseGrounding {
  metric: AiIntentType;
  periodDays?: number;
  numerator?: number;
  denominator?: number;
  clause: string;
}

interface MetricStep {
  id: Id;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

type InsightsModule = {
  assembleResponse?: (intent: AiIntent, executed: RateResult) => AiResponseGrounding;
};

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

const F_AI_GROUNDING: MetricStep[] = [
  { id: 'm1', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-08') },
  { id: 'm2', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-14') },
  { id: 'm3', dueDate: d('2026-06-12'), status: 'DECLINED' },
  { id: 'm4', dueDate: d('2026-06-12'), status: 'CANCELLED' },
  { id: 'm5', dueDate: d('2026-06-15'), status: 'SCHEDULED' },
  { id: 'm6', dueDate: d('2026-05-01'), status: 'SCHEDULED' },
];

describe('TC-AI-007 — every response carries provenance (EXPECTED FAIL)', () => {
  it('carries metric name, period, numerator, denominator and the §13 clause', () => {
    const intent: AiIntent = { type: 'COMPLETION_RATE', periodDays: 30 };
    const executed = completionRate(F_AI_GROUNDING, 30, NOW);

    const assembleResponse = (core as unknown as InsightsModule).assembleResponse;
    const response = assembleResponse?.(intent, executed);

    expect(response?.metric, 'AI-6: the response must name the metric it answers').toBe('COMPLETION_RATE');
    expect(response?.periodDays, 'AI-6: the response must carry the period the figure covers').toBe(30);
    expect(
      response?.numerator,
      'AI-6: the numerator must be present so the figure is checkable, not just stated',
    ).toBe(executed.numerator);
    expect(
      response?.denominator,
      'AI-6: the denominator must be present so the figure is checkable, not just stated',
    ).toBe(executed.denominator);
    expect(
      response?.clause,
      'AI-6: every figure must cite the §13 clause it derives from — a figure with no traceable source is a defect',
    ).toMatch(/§13/);
  });
});
