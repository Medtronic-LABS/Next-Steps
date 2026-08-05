import { describe, expect, it, vi } from 'vitest';
import * as core from '../src/index';
import type { Category } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-2 (batch 7a — intent extraction).
// No insights engine exists in packages/core/src yet: `createInsightsEngine`
// is not exported from `../src/index`. The cast below adds the AI-8 shape
// that the real module doesn't provide, so `factory` is `undefined` here
// and the extraction call resolves through optional chaining to
// `undefined`, never throwing. The `toEqual` below is a genuine runtime
// assertion against the documented intent shape, not an import- or
// construction-time failure, and nothing here is a try/catch hiding a
// thrown error.
//
// AI-2 says a comparison intent "may carry two periods"; it does not
// specify the field name for the second one. `comparePeriodDays` is this
// test's reading, carried alongside `periodDays` so both windows are
// present on the same intent for the (separate, 7b) execution stage to run
// independently through the same §13 function.

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
  comparePeriodDays?: number;
  category?: Category;
}

interface ModelClient {
  extractIntent(question: string): Promise<AiIntent>;
  narrate(question: string, metrics: unknown): Promise<string>;
}

interface InsightsEngine {
  extractIntent(question: string): Promise<AiIntent>;
}

type InsightsModule = { createInsightsEngine?: (client: ModelClient) => InsightsEngine };

function stubModelClient(intent: AiIntent): ModelClient {
  return {
    extractIntent: vi.fn().mockResolvedValue(intent),
    narrate: vi.fn().mockResolvedValue(''),
  };
}

describe('TC-AI-004 — a comparison question (EXPECTED FAIL)', () => {
  it('extracts COMPLETION_RATE carrying two distinct periods to compare', async () => {
    const documentedIntent: AiIntent = { type: 'COMPLETION_RATE', periodDays: 30, comparePeriodDays: 30 };
    const client = stubModelClient(documentedIntent);

    const factory = (core as unknown as InsightsModule).createInsightsEngine;
    const engine = factory?.(client);
    const intent = await engine?.extractIntent('Is completion better than last month?');

    expect(
      intent,
      'AI-2: a comparison question must carry two periods, not resolve to a single-period metric',
    ).toEqual(documentedIntent);

    expect(
      intent?.periodDays,
      'the current period must be present',
    ).toBeDefined();
    expect(
      intent?.comparePeriodDays,
      'the comparison period must be present and distinct from a plain single-period question',
    ).toBeDefined();
  });
});
