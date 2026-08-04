import { describe, expect, it } from 'vitest';
import { DUE } from '../src/catalog';
import type { Category, DueKey } from '../src/types';

// PRD FR-A-5.2 (ITEM-6-TEST-CASES.md TC-CFG-001). FR-A-5.2 describes the
// five categories' due-date defaults as *initial* defaults, not fixed
// values — different programmes need different follow-up intervals (an ANC
// visit interval is not a diabetes review interval). Today every default
// lives in `catalog.ts`'s `META[cat].due`, a hardcoded constant with no
// profile input at all. No `../src/profile` module exists yet, so a static
// import here would fail at collection time, before any test runs, and the
// file would register zero assertions. Importing dynamically inside the
// test body instead defers that same failure to runtime, where it surfaces
// as the named assertions below (same technique as TC-FHIR-001, TC-ID-003).
interface ProgrammeProfile {
  categoryDefaultDue?: Partial<Record<Category, DueKey>>;
}

type GetCategoryDefaultDue = (category: Category, profile?: ProgrammeProfile) => DueKey;

function dueLabel(key: DueKey | undefined): string | undefined {
  return key ? DUE[key]?.label : undefined;
}

describe('TC-CFG-001 — category default due dates come from the profile (EXPECTED FAIL)', () => {
  it('reads the Follow-up Visit default from each profile, not from a shared catalog.ts constant', async () => {
    const oneMonthProfile: ProgrammeProfile = { categoryDefaultDue: { FOLLOW_UP_VISIT: '1m' } };
    const twoWeekProfile: ProgrammeProfile = { categoryDefaultDue: { FOLLOW_UP_VISIT: '2w' } };

    let getCategoryDefaultDue: GetCategoryDefaultDue | undefined;
    try {
      ({ getCategoryDefaultDue } = (await import('../src/profile')) as unknown as {
        getCategoryDefaultDue: GetCategoryDefaultDue;
      });
    } catch {
      getCategoryDefaultDue = undefined;
    }

    const keyUnderOneMonth = getCategoryDefaultDue?.('FOLLOW_UP_VISIT', oneMonthProfile);
    const keyUnderTwoWeeks = getCategoryDefaultDue?.('FOLLOW_UP_VISIT', twoWeekProfile);

    expect(dueLabel(keyUnderOneMonth), 'the 1-month profile must resolve to the "1 month" due-date label').toBe(
      '1 month',
    );
    expect(dueLabel(keyUnderTwoWeeks), 'the 2-week profile must resolve to the "2 weeks" due-date label').toBe(
      '2 weeks',
    );
    expect(
      keyUnderOneMonth,
      'the two profiles disagree, so the value read must come from the profile, not a shared catalog.ts constant',
    ).not.toBe(keyUnderTwoWeeks);
  });
});
