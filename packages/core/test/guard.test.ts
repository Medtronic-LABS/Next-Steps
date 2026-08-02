import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe('TC-GUARD-002 — §6.2 engine boundary intact', () => {
  it('finds no localStorage, concrete engine class, or seed.ts import under apps/', () => {
    const violations: string[] = [];
    for (const file of collectSourceFiles(APPS_DIR)) {
      const contents = readFileSync(file, 'utf8');
      if (/localStorage/.test(contents)) violations.push(`${file}: localStorage`);
      if (/InMemoryCoordinationEngine/.test(contents)) violations.push(`${file}: InMemoryCoordinationEngine`);
      if (/from\s+['"][^'"]*\/seed(\.ts)?['"]/.test(contents) || /require\(['"][^'"]*\/seed(\.ts)?['"]\)/.test(contents)) {
        violations.push(`${file}: seed.ts import`);
      }
    }
    expect(violations).toEqual([]);
  });
});
