import { describe, expect, it } from 'vitest';
import { META } from '../src/catalog';
import type { Category } from '../src/types';

// PRD FR-A-5.1, §3.3 (ITEM-6-TEST-CASES.md TC-CFG-002). Labels are what a
// frontline worker reads; the category key is what §13's metrics and §17's
// FHIR mapping correlate on. A profile must be able to relabel a category —
// "ANC visit" for FOLLOW_UP_VISIT under a maternal programme — without
// touching the key underneath. Today labels live only in `catalog.ts`'s
// `META[cat].label`, with no profile input. No `../src/profile` module
// exists yet, so a static import here would fail at collection time, before
// any test runs, and the file would register zero assertions. Importing
// dynamically inside the test body instead defers that same failure to
// runtime, where it surfaces as the named assertions below (same technique
// as TC-FHIR-001, TC-ID-003).
interface ProgrammeProfile {
  categoryLabels?: Partial<Record<Category, string>>;
}

type GetCategoryLabel = (category: Category, profile?: ProgrammeProfile) => string;

describe('TC-CFG-002 — category labels come from the profile (EXPECTED FAIL)', () => {
  it('relabels Follow-up Visit without changing the underlying category key', async () => {
    const maternalProfile: ProgrammeProfile = { categoryLabels: { FOLLOW_UP_VISIT: 'ANC visit' } };
    const category: Category = 'FOLLOW_UP_VISIT';

    let getCategoryLabel: GetCategoryLabel | undefined;
    try {
      ({ getCategoryLabel } = (await import('../src/profile')) as unknown as {
        getCategoryLabel: GetCategoryLabel;
      });
    } catch {
      getCategoryLabel = undefined;
    }

    const label = getCategoryLabel?.(category, maternalProfile);

    expect(label, 'the profile override must be read, not the catalog.ts default label').toBe('ANC visit');
    expect(
      META[category],
      'FOLLOW_UP_VISIT must remain a valid catalog key even when its label is overridden by the profile',
    ).toBeDefined();
  });
});
