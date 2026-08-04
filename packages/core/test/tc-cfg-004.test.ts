import { describe, expect, it } from 'vitest';
import type { Category } from '../src/types';

// PRD §17, §13 (ITEM-6-TEST-CASES.md TC-CFG-004). The most important case in
// item 6a: if a profile could change a category's Task.code, the CCE could
// not correlate a follow-up visit from a maternal clinic with one from a
// diabetes clinic, and §13's by-category metrics would fragment across
// deployments. A profile must be free to change a category's *label* —
// that's the whole point of TC-CFG-002 — while the *code* stays fixed. No
// `../src/profile` module exists yet, so a static import here would fail at
// collection time, before any test runs, and the file would register zero
// assertions. Importing dynamically inside the test body instead defers
// that same failure to runtime, where it surfaces as the named assertions
// below (same technique as TC-FHIR-001, TC-ID-003).
interface ProgrammeProfile {
  categoryLabels?: Partial<Record<Category, string>>;
}

type GetCategoryTaskCode = (category: Category, profile?: ProgrammeProfile) => string;

describe('TC-CFG-004 — category codes are stable across profiles (EXPECTED FAIL)', () => {
  it('gives the same Task.code for the same category under a diabetes and a maternal profile', async () => {
    const diabetesProfile: ProgrammeProfile = {
      categoryLabels: { FOLLOW_UP_VISIT: 'Follow-up visit' },
    };
    const maternalProfile: ProgrammeProfile = {
      categoryLabels: { FOLLOW_UP_VISIT: 'ANC visit' },
    };

    let getCategoryTaskCode: GetCategoryTaskCode | undefined;
    try {
      ({ getCategoryTaskCode } = (await import('../src/profile')) as unknown as {
        getCategoryTaskCode: GetCategoryTaskCode;
      });
    } catch {
      getCategoryTaskCode = undefined;
    }

    const codeUnderDiabetes = getCategoryTaskCode?.('FOLLOW_UP_VISIT', diabetesProfile);
    const codeUnderMaternal = getCategoryTaskCode?.('FOLLOW_UP_VISIT', maternalProfile);

    expect(codeUnderDiabetes, 'the diabetes profile must resolve a coded Task.code value').toBeTruthy();
    expect(codeUnderMaternal, 'the maternal profile must resolve a coded Task.code value').toBeTruthy();

    // The central assertion: codes must be EQUAL across profiles, not
    // merely both present. Labels legitimately differ ("Follow-up visit"
    // vs "ANC visit"); the interoperability contract must not.
    expect(
      codeUnderMaternal,
      'Task.code.coding[].code must be identical across profiles even though the label differs',
    ).toBe(codeUnderDiabetes);
  });
});
