import { describe, expect, it } from 'vitest';
import * as core from '../src/index';

// ITEM-7-AI-INSIGHTS.md AI-3 (batch 7c — guardrails).
//
// `assembleResponse` (batch 7b, real and exported) already handles an
// UNSUPPORTED intent for grounding: it returns
// `{ metric: 'UNSUPPORTED', clause: 'no §13 function executed' }`. That is
// a structured record for the UI, not the plain-language message a
// programme leader reads. Nothing in packages/core/src/insights.ts produces
// that message, and nothing states what *is* available instead — the
// pressure AI-3's own rationale calls out ("the pressure to be helpful is
// exactly what produces a confident wrong answer") has no code standing
// against it.
//
// This test hypothesizes the missing message-producing function as
// `unsupportedNarration`. It is not exported from `../src/index`, so the
// cast below resolves it to `undefined` and the call resolves through
// optional chaining to `undefined`, never throwing. The assertions are
// genuine runtime comparisons against the documented requirements for that
// message, not import- or construction-time failures, and nothing here is
// a try/catch hiding a thrown error.

type InsightsModule = {
  unsupportedNarration?: () => string;
};

describe('TC-AI-012 — an unanswerable question invents nothing (EXPECTED FAIL)', () => {
  it('states plainly that the question cannot be answered, says what is available, and contains no figures', () => {
    const unsupportedNarration = (core as unknown as InsightsModule).unsupportedNarration;
    const message = unsupportedNarration?.();

    expect.soft(
      typeof message,
      'AI-3: an UNSUPPORTED intent must produce a plain-language message stating the question cannot be answered — no such message-producing function exists',
    ).toBe('string');

    const lower = (message ?? '').toLowerCase();

    expect.soft(
      lower.includes('cannot') || lower.includes("can't"),
      'AI-3: the message must plainly state that the question cannot be answered from available data',
    ).toBe(true);

    expect.soft(
      lower.includes('available'),
      'AI-3: the message must say what is available, per the AI-2 supported intent set, instead of leaving the leader with nothing',
    ).toBe(true);

    expect.soft(/\d/.test(message ?? ''), 'AI-3: a response declining an unanswerable question must contain no figures').toBe(
      false,
    );
  });
});
