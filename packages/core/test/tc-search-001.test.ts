import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

// FR-A-2.2: an all-digit query is a mobile search — exact match, and prefix
// match only from 4 digits upward. Below 4 digits nothing should match, even
// against a full 10-digit query's own digits; matching from the middle or
// end of a number is never valid, regardless of length. The current
// implementation does `mobile.includes(digits)` with no minimum length at
// all, so it over-matches short queries and matches non-prefix substrings.
// All six probes are built from Ramesh Kulkarni's SEED mobile, 98450 12210
// (digits 9845012210).
const CASES: { digits: string; expected: string[] }[] = [
  { digits: '9', expected: [] }, // 1 digit — below the 4-digit floor
  { digits: '984', expected: [] }, // 3 digits — below the 4-digit floor
  { digits: '9845', expected: ['Ramesh Kulkarni'] }, // 4 digits — genuine leading prefix
  { digits: '984501221', expected: ['Ramesh Kulkarni'] }, // 9 digits — genuine leading prefix
  { digits: '9845012210', expected: ['Ramesh Kulkarni'] }, // 10 digits — exact match
  { digits: '210', expected: [] }, // the number's own trailing digits — a substring, not a prefix
];

describe('TC-SEARCH-001 — FR-A-2.2 mobile search digit boundaries (EXPECTED FAIL)', () => {
  for (const { digits, expected } of CASES) {
    it(`"${digits}" (${digits.length} digits) → ${expected.length ? expected.join(', ') : 'no results'}`, async () => {
      const engine = new InMemoryCoordinationEngine();
      const result = await engine.searchPatients(digits);
      expect(result.map((p) => p.name)).toEqual(expected);
    });
  }
});
