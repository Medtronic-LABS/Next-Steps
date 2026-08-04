import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER } from '../src/catalog';
import type { Category } from '../src/types';

// PRD FR-A-5.1 (ITEM-6-TEST-CASES.md TC-MAT-002). This is the load-bearing
// case in item 6c: the reframe in ITEM-6-TEST-CASES.md claims an ANC visit,
// an anaemia screening, a high-risk-pregnancy referral, an IFA adherence
// call and an immunisation reminder each already fit one of FR-A-5.1's five
// existing categories — no sixth category is needed. `../src/maternalSeed`
// does not exist yet, so it is imported dynamically inside the test body
// (same technique as TC-CFG-004/005): a static import of a missing module
// fails at collection time, before any test runs, registering zero
// assertions; a dynamic import defers that failure to runtime, where it
// surfaces as the named assertions below. `CATEGORY_ORDER` is imported
// statically from the real, unmodified ../src/catalog.ts — the fixed
// FR-A-5.1 enumeration this test checks the maternal steps against.

interface MaternalWorkStep {
  id: string;
  name: string;
  cat: Category;
  detail: string;
}

describe('TC-MAT-002 — maternal next steps map onto the five categories, no sixth (EXPECTED FAIL)', () => {
  it('maps ANC visit / anaemia screening / high-risk referral / IFA call / immunisation reminder onto FOLLOW_UP_VISIT, LAB_INVESTIGATION, SPECIALIST_REFERRAL, FOLLOW_UP_CALL, OTHER and introduces no sixth category', async () => {
    let MATERNAL_WORK: MaternalWorkStep[] | undefined;
    try {
      ({ MATERNAL_WORK } = (await import('../src/maternalSeed')) as unknown as {
        MATERNAL_WORK: MaternalWorkStep[];
      });
    } catch {
      MATERNAL_WORK = undefined;
    }

    expect(MATERNAL_WORK, 'a maternal seed clinic work list must exist (../src/maternalSeed)').toBeDefined();

    const steps = MATERNAL_WORK ?? [];
    const find = (needle: RegExp) => steps.find((s) => needle.test(s.detail) || needle.test(s.name));

    const expectedMap: [string, MaternalWorkStep | undefined, Category][] = [
      ['ANC visit', find(/\banc\b.*visit|visit.*\banc\b/i), 'FOLLOW_UP_VISIT'],
      ['anaemia screening', find(/an[ae]mia/i), 'LAB_INVESTIGATION'],
      ['high-risk pregnancy referral', find(/high[-\s]?risk/i), 'SPECIALIST_REFERRAL'],
      ['IFA adherence call', find(/\bifa\b/i), 'FOLLOW_UP_CALL'],
      ['immunisation reminder', find(/immuni[sz]ation/i), 'OTHER'],
    ];

    for (const [label, step, expectedCategory] of expectedMap) {
      expect(step, `the maternal seed clinic must contain a step for "${label}"`).toBeDefined();
      expect(step?.cat, `"${label}" must map to the existing FR-A-5.1 category ${expectedCategory}`).toBe(
        expectedCategory,
      );
    }

    // The load-bearing assertion: FR-A-5.1 still defines exactly five
    // categories, and every category used by the five maternal steps above
    // must be one of them. If a maternal workflow needed a category outside
    // this fixed enumeration, one of the two checks below fails — which is
    // exactly the falsification of the condition-agnostic claim.
    expect(
      CATEGORY_ORDER.length,
      'FR-A-5.1 must still define exactly five categories — no sixth was added to support the maternal profile',
    ).toBe(5);

    const usedCategories = new Set(expectedMap.map(([, step]) => step?.cat).filter((c): c is Category => c != null));
    for (const cat of usedCategories) {
      expect(
        CATEGORY_ORDER,
        `category "${cat}" used by a maternal step must already be one of FR-A-5.1's five categories, not a new one`,
      ).toContain(cat);
    }
  });
});
