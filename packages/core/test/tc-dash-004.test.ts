import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// BR-018: every dashboard figure must derive from Next Step, Visit or
// Patient coordination fields — never a hardcoded fixture
// (ITEM-4-TEST-CASES.md TC-DASH-004). `INSIGHTS_BY_PERIOD` is exactly such a
// fixture: a lookup table of pre-computed numbers keyed by period, with no
// path back to any WorkStep/Visit/Patient field. Its presence anywhere in
// packages/core/src means at least one figure on the doctor dashboard was
// authored by hand rather than produced by a formula.
const CORE_SRC_DIR = join(__dirname, '..', 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('TC-DASH-004 — every insights figure traces to coordination state (EXPECTED FAIL)', () => {
  it('finds no INSIGHTS_BY_PERIOD (or equivalent fixture) left in packages/core/src', () => {
    const violations: string[] = [];
    for (const file of collectSourceFiles(CORE_SRC_DIR)) {
      const contents = readFileSync(file, 'utf8');
      if (/INSIGHTS_BY_PERIOD/.test(contents)) violations.push(file);
    }
    expect(violations, 'INSIGHTS_BY_PERIOD must not remain anywhere in packages/core/src').toEqual([]);
  });
});
