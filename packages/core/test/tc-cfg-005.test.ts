import { describe, expect, it } from 'vitest';
import type { Category, DueKey } from '../src/types';

// PRD FR-A-5.2, §10.5 (ITEM-6-TEST-CASES.md TC-CFG-005). A deployment will
// supply a partial profile — most clinics will tune one or two values and
// leave the rest at their documented defaults. Failing hard on an absent
// optional field turns a configuration convenience into a deployment
// blocker, so every accessor must fall back to a documented default rather
// than return undefined. No `../src/profile` module exists yet, so a static
// import here would fail at collection time, before any test runs, and the
// file would register zero assertions. Importing dynamically inside the
// test body instead defers that same failure to runtime, where it surfaces
// as the named assertions below (same technique as TC-FHIR-001, TC-ID-003).
interface ProgrammeProfile {
  categoryLabels?: Partial<Record<Category, string>>;
  categoryDefaultDue?: Partial<Record<Category, DueKey>>;
  unreachableThreshold?: number;
  lostToFollowUpDays?: number;
}

type GetCategoryLabel = (category: Category, profile?: ProgrammeProfile) => string;
type GetCategoryDefaultDue = (category: Category, profile?: ProgrammeProfile) => DueKey;
type GetUnreachableThreshold = (profile?: ProgrammeProfile) => number;
type GetLostToFollowUpDays = (profile?: ProgrammeProfile) => number;

describe('TC-CFG-005 — a partial profile falls back to documented defaults (EXPECTED FAIL)', () => {
  it('fills every unspecified field with its documented default, and throws nothing', async () => {
    // Only unreachableThreshold is set — categoryLabels, categoryDefaultDue
    // and lostToFollowUpDays are all absent.
    const partialProfile: ProgrammeProfile = { unreachableThreshold: 5 };

    let getCategoryLabel: GetCategoryLabel | undefined;
    let getCategoryDefaultDue: GetCategoryDefaultDue | undefined;
    let getUnreachableThreshold: GetUnreachableThreshold | undefined;
    let getLostToFollowUpDays: GetLostToFollowUpDays | undefined;
    try {
      ({ getCategoryLabel, getCategoryDefaultDue, getUnreachableThreshold, getLostToFollowUpDays } =
        (await import('../src/profile')) as unknown as {
          getCategoryLabel: GetCategoryLabel;
          getCategoryDefaultDue: GetCategoryDefaultDue;
          getUnreachableThreshold: GetUnreachableThreshold;
          getLostToFollowUpDays: GetLostToFollowUpDays;
        });
    } catch {
      getCategoryLabel = undefined;
      getCategoryDefaultDue = undefined;
      getUnreachableThreshold = undefined;
      getLostToFollowUpDays = undefined;
    }

    expect(
      () => getCategoryLabel?.('FOLLOW_UP_VISIT', partialProfile),
      'reading an absent field must not throw',
    ).not.toThrow();

    expect(
      getCategoryLabel?.('FOLLOW_UP_VISIT', partialProfile),
      'an absent categoryLabels override must fall back to the documented default label, not undefined',
    ).toBe('Follow-up visit');
    expect(
      getCategoryDefaultDue?.('FOLLOW_UP_VISIT', partialProfile),
      'an absent categoryDefaultDue override must fall back to the documented default key, not undefined',
    ).toBe('1m');
    expect(
      getLostToFollowUpDays?.(partialProfile),
      'an absent lostToFollowUpDays must fall back to the documented default of 30, not undefined',
    ).toBe(30);

    // The one field the profile does specify must still be honoured —
    // proves this is a genuine partial-merge fallback, not "always default".
    expect(
      getUnreachableThreshold?.(partialProfile),
      'the field the profile does specify (5) must still be read, not overridden by the fallback',
    ).toBe(5);
  });
});
