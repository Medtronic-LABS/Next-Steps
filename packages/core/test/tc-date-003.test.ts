import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// §10, FR-D-2.4 (data freshness): the "today" label shown in the admin
// worklist header (apps/admin/src/App.tsx:606) must reflect the clinic's
// actual current date, not a fixed calendar date baked in at build time
// (ITEM-4-TEST-CASES.md TC-DATE-003). `TODAY_LABEL` in seed.ts is the
// literal string 'Monday, 6 July' — correct only on that one date and wrong
// on every other day the app is opened. Two checks: the source must not
// assign TODAY_LABEL a fixed string literal, and re-deriving it for a
// different "now" must produce a label that matches that "now", not 6 July.
const SEED_PATH = join(__dirname, '..', 'src', 'seed.ts');
const HARDCODED_LITERAL_ASSIGNMENT = /export const TODAY_LABEL\s*=\s*(['"])(?:(?!\1).)*\1\s*;/;

function expectedTodayLabel(now: Date): string {
  const weekday = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const day = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });
  const month = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' });
  return `${weekday}, ${day} ${month}`;
}

// Noon IST, a Saturday — deliberately not 6 July, so a properly derived
// label and the current hardcoded literal cannot both be correct.
const ARBITRARY_NOW = new Date('2026-06-20T06:30:00.000Z');

describe("TC-DATE-003 — today's date label is derived from now, not a fixed literal (EXPECTED FAIL)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(ARBITRARY_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('static check: TODAY_LABEL is not assigned a fixed string literal in seed.ts', () => {
    const source = readFileSync(SEED_PATH, 'utf8');
    expect(
      HARDCODED_LITERAL_ASSIGNMENT.test(source),
      'expected TODAY_LABEL to be computed from the current date, not assigned a fixed string literal',
    ).toBe(false);
  });

  it('derives "today" from the current date instead of always reading "Monday, 6 July"', async () => {
    const { TODAY_LABEL } = await import('../src/seed');
    expect(TODAY_LABEL).toBe(expectedTodayLabel(ARBITRARY_NOW));
  });
});
