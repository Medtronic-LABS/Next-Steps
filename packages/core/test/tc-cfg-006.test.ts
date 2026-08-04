import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// PRD FR-D-2.2, §3.3 (ITEM-6-TEST-CASES.md TC-CFG-006). `DrillKey` — the
// doctor dashboard's drill-down shape — hardcodes 'invest' and 'referral':
// diabetology shorthand baked into a type that no profile can reach. Every
// drill-down key must instead derive from a category key (FOLLOW_UP_VISIT,
// LAB_INVESTIGATION, ...) or a coordination state (overdue, unreachable,
// lost), because that is the vocabulary a profile actually configures.
//
// The unit assertion exercises the *runtime* consequence: summaryCards(),
// which the doctor app calls to render its cards, is built straight off
// CARD_DEFS — the object literal that carries the hardcoded 'invest' /
// 'referral' keys (packages/core/src/seed.ts). The static check confirms the
// type itself, in packages/core/src/types.ts, still names them.
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

describe('TC-CFG-006 — drill-down keys derive from categories (EXPECTED FAIL)', () => {
  it('summaryCards() returns no diabetology-shorthand key ("invest" / "referral")', async () => {
    const { InMemoryCoordinationEngine } = await import('../src/inMemoryEngine');
    const engine = new InMemoryCoordinationEngine();

    const cards = await engine.summaryCards();
    const keys = cards.map((c) => c.key);

    expect(
      keys,
      'no summary-card key may be the diabetology abbreviation "invest" — a drill-down key must derive from a category key or a coordination state',
    ).not.toContain('invest');
    expect(
      keys,
      'no summary-card key may be the diabetology abbreviation "referral" — a drill-down key must derive from a category key or a coordination state',
    ).not.toContain('referral');
  });

  it('the DrillKey type in types.ts names no hardcoded "invest" / "referral" literal', () => {
    const typesFile = join(CORE_SRC_DIR, 'types.ts');
    const contents = readFileSync(typesFile, 'utf8');

    const violations: string[] = [];
    if (/['"]invest['"]/.test(contents)) violations.push('invest');
    if (/['"]referral['"]/.test(contents)) violations.push('referral');

    expect(
      violations,
      'DrillKey (packages/core/src/types.ts) must not hardcode the diabetology-shorthand literals "invest" or "referral"',
    ).toEqual([]);
  });
});
