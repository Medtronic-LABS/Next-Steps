import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTodayLabel } from '../src/logic';

// §10, FR-D-2.4 (data freshness): the "today" label shown in the admin
// worklist header (apps/admin/src/App.tsx:606) must reflect the clinic's
// actual current date, not a fixed calendar date baked in at build time
// (ITEM-4-TEST-CASES.md TC-DATE-003). `TODAY_LABEL` in seed.ts is the
// literal string 'Monday, 6 July' — correct only on that one date and wrong
// on every other day the app is opened. The fix removes TODAY_LABEL
// entirely and replaces it with a derived label, so this asserts both that
// TODAY_LABEL is gone and that a derived replacement exists.
const CORE_SRC_DIR = join(__dirname, '..', 'src');
const APPS_DIR = join(__dirname, '..', '..', '..', 'apps');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function expectedTodayLabel(now: Date): string {
  const weekday = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const day = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });
  const month = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' });
  return `${weekday}, ${day} ${month}`;
}

// Noon IST, a Saturday — deliberately not 6 July, so a properly derived
// label and the removed hardcoded literal cannot both be correct.
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

  it('static check: TODAY_LABEL appears nowhere in packages/core/src or apps/', () => {
    const violations: string[] = [];
    for (const file of [...collectSourceFiles(CORE_SRC_DIR), ...collectSourceFiles(APPS_DIR)]) {
      if (/TODAY_LABEL/.test(readFileSync(file, 'utf8'))) violations.push(file);
    }
    expect(violations, 'TODAY_LABEL must not remain anywhere in packages/core/src or apps/').toEqual([]);
  });

  it('derives "today" from the current date instead of always reading "Monday, 6 July"', () => {
    expect(formatTodayLabel(new Date())).toBe(expectedTodayLabel(ARBITRARY_NOW));
  });
});
