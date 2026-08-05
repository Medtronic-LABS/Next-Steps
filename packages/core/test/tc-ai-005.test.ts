import { describe, expect, it, vi } from 'vitest';
import * as core from '../src/index';
import * as logic from '../src/logic';
import type { Category } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-2, AI-3 (batch 7a — intent extraction).
// No insights engine exists in packages/core/src yet: `createInsightsEngine`
// is not exported from `../src/index`. The cast below adds the AI-8 shape
// that the real module doesn't provide, so `factory` is `undefined` here
// and the extraction call resolves through optional chaining to
// `undefined`, never throwing. The `toEqual` below is a genuine runtime
// assertion against the documented intent shape, not an import- or
// construction-time failure, and nothing here is a try/catch hiding a
// thrown error.

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

describe('TC-AI-005 — an unsupported question returns UNSUPPORTED (EXPECTED FAIL)', () => {
  it('extracts UNSUPPORTED for a village-level question, computing and approximating nothing', async () => {
    const documentedIntent: AiIntent = { type: 'UNSUPPORTED' };
    const client = stubModelClient(documentedIntent);
    const completionRateSpy = vi.spyOn(logic, 'completionRate');
    const referralCompletionSpy = vi.spyOn(logic, 'referralCompletionRateBySpecialty');

    const factory = (core as unknown as InsightsModule).createInsightsEngine;
    const engine = factory?.(client);
    const intent = await engine?.extractIntent('Which villages have the worst completion?');

    expect(
      intent,
      'AI-2, AI-3: no geography exists in the data model — this must resolve to UNSUPPORTED, not an approximated metric',
    ).toEqual(documentedIntent);

    expect(
      completionRateSpy,
      'AI-3: an unsupported question must not fall back to a metric that merely looks close enough',
    ).not.toHaveBeenCalled();
    expect(
      referralCompletionSpy,
      'AI-3: an unsupported question must not fall back to a metric that merely looks close enough',
    ).not.toHaveBeenCalled();
  });
});
