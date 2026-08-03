import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorklistSections } from '../src/engine';
import type { Category } from '../src/types';

// §10.5: the unreachable-attempts threshold must be clinic configuration,
// not a hardcoded constant. Today there is no threshold parameter
// anywhere — `sections()` takes only a category filter (engine.ts) — and
// Unreachable membership comes solely from the frozen `section: 'unreach'`
// value baked into seed steps at authoring time, so no threshold is ever
// consulted at all.
//
// Attempts can't be set through the public capture API either
// (recordVisit hardcodes `attempts: 0` for every newly captured step), so
// this substitutes the seed fixture's own attempts counts — w3 (1
// attempt), w8 (3 attempts), w9 (4 attempts) — for the case's 2/3/4, since
// no other combination of attempts counts is reachable. The shape of the
// assertion (below-threshold step never Unreachable; at-or-above-threshold
// steps are) is unchanged. vi.resetModules() + a dynamic import pin the
// seed's relative dueDates to a known fake "now".
type SectionsWithThreshold = (filter: Category | 'all', unreachableThreshold?: number) => Promise<WorklistSections>;

const NOW = new Date('2026-06-20T09:00:00.000Z');

describe('TC-SECT-004 — §10.5 unreachable threshold is configurable (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('at threshold 3, the 3- and 4-attempt steps are Unreachable; at threshold 4, only the 4-attempt step is', async () => {
    const { InMemoryCoordinationEngine } = await import('../src/inMemoryEngine');
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { sections: SectionsWithThreshold };

    const atDefault = await call.sections('all', 3);
    const unreachAtDefault = atDefault.unreach.map((s) => s.id);
    expect(unreachAtDefault, '3 failed attempts should be Unreachable at threshold 3').toContain('w8');
    expect(unreachAtDefault, '4 failed attempts should be Unreachable at threshold 3').toContain('w9');
    expect(unreachAtDefault, '1 failed attempt should not be Unreachable at threshold 3').not.toContain('w3');

    const atFour = await call.sections('all', 4);
    const unreachAtFour = atFour.unreach.map((s) => s.id);
    expect(unreachAtFour, '4 failed attempts should still be Unreachable at threshold 4').toContain('w9');
    expect(
      unreachAtFour,
      '3 failed attempts should no longer be Unreachable once the threshold is raised to 4',
    ).not.toContain('w8');
  });
});
