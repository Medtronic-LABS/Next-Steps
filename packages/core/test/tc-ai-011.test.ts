import { describe, expect, it } from 'vitest';
import * as core from '../src/index';

// ITEM-7-AI-INSIGHTS.md AI-5, §3.3 (batch 7c — guardrails).
//
// `validateNarration` (batch 7b, real and exported) checks only that every
// numeral in a narration traces to a computed figure — AI-1's concern. It
// has no notion of framing: a narration can pass numeral validation while
// still attributing the figure to a named person as personal performance,
// which is exactly what §3.3 forbids. No framing check exists anywhere in
// packages/core/src/insights.ts.
//
// This test hypothesizes the missing check as `validateFraming`, mirroring
// the real `validateNarration`'s shape. `validateFraming` is not exported
// from `../src/index`, so the cast below resolves it to `undefined` and the
// calls below resolve through optional chaining to `undefined`, never
// throwing. The assertions are genuine runtime comparisons against the
// documented verdict for each example narration, not import- or
// construction-time failures, and nothing here is a try/catch hiding a
// thrown error.

interface FramingValidation {
  valid: boolean;
  violations?: string[];
}

type InsightsModule = {
  validateFraming?: (narration: string) => FramingValidation;
};

describe('TC-AI-011 — no staff-performance framing (EXPECTED FAIL)', () => {
  it('rejects narration that attributes a metric to a named person as personal performance', () => {
    const validateFraming = (core as unknown as InsightsModule).validateFraming;

    const forbidden = validateFraming?.('Priya only completed 40% of her worklist.');
    expect.soft(
      forbidden?.valid,
      'AI-5, §3.3: "Priya only completed 40% of her worklist" attributes a metric to a named individual as personal performance and must fail validation',
    ).toBe(false);
  });

  it('accepts care-journey framing that names no individual', () => {
    const validateFraming = (core as unknown as InsightsModule).validateFraming;

    const allowed = validateFraming?.('38 next steps are overdue beyond 30 days.');
    expect.soft(
      allowed?.valid,
      'AI-5, §3.3: "38 next steps are overdue beyond 30 days" describes the patients\' care, not a person\'s performance, and must pass validation',
    ).toBe(true);
  });
});
