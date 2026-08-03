import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// §13, §3.3: "Administrator throughput" — steps moved to a terminal state
// today ÷ steps actionable today — is the one metric §13 confines to the
// admin worklist header. §3.3 frames the whole product as care-journey, not
// staff performance, so no throughput/staff/per-user performance figure may
// appear anywhere in the doctor app (ITEM-4-TEST-CASES.md TC-DASH-005).
const APPS_DIR = join(__dirname, '..', '..', '..', 'apps');
const DOCTOR_APP_DIR = join(APPS_DIR, 'doctor', 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

// Case-insensitive; matches the PRD §13 term itself plus the generic
// staff/per-user-performance framing §3.3 forbids everywhere in this app.
const STAFF_PERFORMANCE_TERMS = [/throughput/i, /staff performance/i, /per-user performance/i];

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

// Unlike TC-DASH-001 to 004, this one is not expected to fail today: no
// throughput/staff-performance figure has been built in either app yet, so
// there is nothing to leak into the doctor app. It stands as a regression
// guard for when Administrator throughput is implemented in the admin
// worklist header.
describe('TC-DASH-005 — administrator throughput stays out of the doctor app', () => {
  it('finds no throughput/staff/per-user performance figure anywhere under apps/doctor/src', () => {
    const violations: string[] = [];
    for (const file of collectSourceFiles(DOCTOR_APP_DIR)) {
      const contents = readFileSync(file, 'utf8');
      for (const term of STAFF_PERFORMANCE_TERMS) {
        if (term.test(contents)) violations.push(`${file}: ${term}`);
      }
    }
    expect(violations, 'no staff/administrator-throughput figure may appear in the doctor app').toEqual([]);
  });
});
