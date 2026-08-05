import { describe, expect, it } from 'vitest';
import * as core from '../src/index';
import { completionRate } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-1 (batch 7b — execution and grounding).
// This is the load-bearing case of the whole item (see the spec's own
// framing): without a check that every numeral in the narration traces to
// a computed metric, "the model never produces a number" is an intention,
// not a property. No narration-validation stage exists in
// packages/core/src/insights.ts yet — it exports only
// `createInsightsEngine`/`AiIntent`/`ModelClient`, nothing that checks a
// model's narration against the figures that were actually computed.
// `validateNarration` is not exported from `../src/index`. The cast below
// adds the AI-1 shape — a standalone function from (narration, computed
// numerals) to a validation verdict — that the real module doesn't
// provide, so `validateNarration` is `undefined` here and the call
// resolves through optional chaining to `undefined`, never throwing. The
// assertions below are genuine runtime comparisons against the documented
// validation verdict, not import- or construction-time failures, and
// nothing here is a try/catch hiding a thrown error.
//
// This test's reading of the (currently nonexistent) API:
// `validateNarration(narration, computedNumerals)` extracts every numeral
// from the narration string and returns `{ valid, invalidNumerals }`,
// where `invalidNumerals` lists numerals present in the narration but
// absent from `computedNumerals`. `valid` is true only when
// `invalidNumerals` is empty.

interface MetricStep {
  id: Id;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

interface NarrationValidation {
  valid: boolean;
  invalidNumerals: number[];
}

type InsightsModule = {
  validateNarration?: (narration: string, computedNumerals: number[]) => NarrationValidation;
};

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

// Same fixture as TC-AI-006/TC-MET-001: completionRate resolves to 50% (2 of 4).
const F_AI_NARRATION: MetricStep[] = [
  { id: 'm1', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-08') },
  { id: 'm2', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-14') },
  { id: 'm3', dueDate: d('2026-06-12'), status: 'DECLINED' },
  { id: 'm4', dueDate: d('2026-06-12'), status: 'CANCELLED' },
  { id: 'm5', dueDate: d('2026-06-15'), status: 'SCHEDULED' },
  { id: 'm6', dueDate: d('2026-05-01'), status: 'SCHEDULED' },
];

describe('TC-AI-008 — no numeral appears that was not computed (EXPECTED FAIL)', () => {
  it('rejects a narration that inserts a figure — 45% — that was never computed', () => {
    const computed = completionRate(F_AI_NARRATION, 30, NOW);
    expect(computed, 'sanity check on the fixture: 50% (2 of 4)').toEqual({ numerator: 2, denominator: 4, rate: 50 });

    // Only 50% (rate 50, numerator 2, denominator 4) was ever computed.
    // The stubbed model's narration invents "45% last month" — a figure
    // that traces to no §13 call on this fixture.
    const computedNumerals = [computed.numerator, computed.denominator, computed.rate];
    const modelNarration = '50%, up from 45% last month';

    const validateNarration = (core as unknown as InsightsModule).validateNarration;
    const validation = validateNarration?.(modelNarration, computedNumerals);

    expect(
      validation?.valid,
      'AI-1: a narration containing a figure absent from the computed metric set must fail validation and never be rendered',
    ).toBe(false);

    expect(
      validation?.invalidNumerals,
      'AI-1: the specific uncomputed figure (45) must be identified so it is rejected, not silently passed through',
    ).toContain(45);
  });
});
