import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// PRD FR-A-5.1, FR-A-5.2 (ITEM-6-TEST-CASES.md, 6a/6b boundary). 6a added
// getCategoryLabel() and getCategoryDefaultDue() to packages/core/src/profile.ts
// so a category's label and default due-date key could be read from a
// programme profile instead of from the catalog.ts constant. Adding the
// accessors is not the same as wiring them in: both apps and the engine
// still read `META[cat].label` / `META[cat].due` directly, so a profile
// override written today would silently do nothing at every call site that
// renders a label or seeds a due date.
//
// Static check over the source tree (excluding catalog.ts, which defines
// META, and profile.ts, whose accessors legitimately fall back to it):
// there must be no direct `META[...].label` / `META[...].due` read outside
// those two files, and the accessors themselves must have at least one call
// site elsewhere.
const CORE_SRC_DIR = join(__dirname, '..', 'src');
const APP_SRC_DIRS = [
  join(__dirname, '..', '..', '..', 'apps', 'admin', 'src'),
  join(__dirname, '..', '..', '..', 'apps', 'doctor', 'src'),
];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const EXCLUDED_BASENAMES = new Set(['catalog.ts', 'profile.ts']);

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

const ALL_SCAN_DIRS = [CORE_SRC_DIR, ...APP_SRC_DIRS];
const DIRECT_META_ACCESS = /META\s*\[[^\]]+\]\s*\.\s*(label|due)\b/;
const ACCESSOR_NAMES = ['getCategoryLabel', 'getCategoryDefaultDue'];

describe('TC-CFG-008 — call sites use the profile accessors, not META directly (EXPECTED FAIL)', () => {
  it('finds no direct META[cat].label / META[cat].due read outside catalog.ts and profile.ts', () => {
    const violations: string[] = [];
    for (const srcDir of ALL_SCAN_DIRS) {
      for (const file of collectSourceFiles(srcDir)) {
        const base = file.split('/').pop() ?? '';
        if (EXCLUDED_BASENAMES.has(base)) continue;
        const contents = readFileSync(file, 'utf8');
        if (DIRECT_META_ACCESS.test(contents)) violations.push(file);
      }
    }

    expect(
      violations,
      'apps and the engine must read a category label/default-due through getCategoryLabel()/getCategoryDefaultDue(), not META[cat].label / META[cat].due directly — a profile override would otherwise be silently ignored',
    ).toEqual([]);
  });

  it('getCategoryLabel() / getCategoryDefaultDue() have at least one call site outside profile.ts', () => {
    const callSites: string[] = [];
    for (const srcDir of ALL_SCAN_DIRS) {
      for (const file of collectSourceFiles(srcDir)) {
        const base = file.split('/').pop() ?? '';
        if (base === 'profile.ts') continue;
        const contents = readFileSync(file, 'utf8');
        for (const name of ACCESSOR_NAMES) {
          if (contents.includes(name)) callSites.push(`${file}: ${name}`);
        }
      }
    }

    expect(
      callSites.length,
      'the 6a profile accessors exist but nothing outside profile.ts calls them yet — no app or engine call site uses getCategoryLabel()/getCategoryDefaultDue()',
    ).toBeGreaterThan(0);
  });
});
