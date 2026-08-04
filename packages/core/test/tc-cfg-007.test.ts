import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// PRD §3.3 (ITEM-6-TEST-CASES.md TC-CFG-007). A single hardcoded "diabetes"
// (or its relatives) in either app's copy would undermine the
// condition-agnostic claim on stage, mid-demo, in a maternal-health
// configuration. Condition names may only ever arrive on screen through
// profile or seed configuration — never baked into app source.
//
// This is a pure static check over apps/admin/src and apps/doctor/src (no
// profile or seed data lives there), searching for the condition-name terms
// TC-CFG-007 names verbatim: diabetes, diabetic, diabetology, HbA1c,
// glycaemic, RSSDI.
const APP_SRC_DIRS = [
  join(__dirname, '..', '..', '..', 'apps', 'admin', 'src'),
  join(__dirname, '..', '..', '..', 'apps', 'doctor', 'src'),
];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const CONDITION_TERMS = ['diabetes', 'diabetic', 'diabetology', 'hba1c', 'glycaemic', 'rssdi'];

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

describe('TC-CFG-007 — no condition name is hardcoded in either app (EXPECTED FAIL)', () => {
  it('finds no diabetes/diabetic/diabetology/HbA1c/glycaemic/RSSDI in apps/admin/src or apps/doctor/src', () => {
    const violations: string[] = [];
    for (const srcDir of APP_SRC_DIRS) {
      for (const file of collectSourceFiles(srcDir)) {
        const contents = readFileSync(file, 'utf8');
        for (const term of CONDITION_TERMS) {
          if (new RegExp(term, 'i').test(contents)) {
            violations.push(`${file}: "${term}"`);
          }
        }
      }
    }

    expect(
      violations,
      'a condition name reached app copy — any condition name reaching the screen must come from profile/seed configuration, not app source (§3.3)',
    ).toEqual([]);
  });
});
