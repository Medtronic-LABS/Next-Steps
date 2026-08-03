import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InMemoryCoordinationEngine as InMemoryCoordinationEngineType } from '../src/inMemoryEngine';
import type { WorkStep } from '../src/types';

// FR-D-3, BR-018: insights() must derive the completion rate from live
// coordination state, not the hardcoded INSIGHTS_BY_PERIOD lookup
// (ITEM-4-TEST-CASES.md TC-DASH-001). We complete one open seed step whose
// due date falls inside the 30-day period, then assert insights(30) reports
// the *exact* new figure the §13 completionRate formula gives for the
// resulting state — not merely a value that differs from before.
//
// vi.resetModules() + a dynamic import pin seed.ts's `daysFromNow` offsets to
// ARBITRARY_NOW (see tc-seed-001.test.ts) so every step's period membership
// is deterministic regardless of when this suite happens to run.
const ARBITRARY_NOW = new Date('2030-10-15T09:00:00.000Z');

describe('TC-DASH-001 — insights derive from live state (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(ARBITRARY_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('completing an in-period open step changes completionRate to the exact §13 figure', async () => {
    const { InMemoryCoordinationEngine } = await import('../src/inMemoryEngine');
    const { WORK } = await import('../src/seed');
    const { completionRate } = await import('../src/logic');
    const engine: InMemoryCoordinationEngineType = new InMemoryCoordinationEngine();

    // w2: FOLLOW_UP_VISIT, due 5 days ago, SCHEDULED — open, and inside the
    // 30-day period.
    const targetId = 'w2';
    const target = WORK.find((w) => w.id === targetId);
    expect(target, 'fixture must still contain w2').toBeTruthy();

    const before = await engine.insights(30);

    await engine.completeStep(targetId, ARBITRARY_NOW);

    const after = await engine.insights(30);

    const stateAfterCompletion: WorkStep[] = WORK.map((w) =>
      w.id === targetId ? { ...w, status: 'COMPLETED', completedDate: ARBITRARY_NOW } : w,
    );
    const expected = completionRate(stateAfterCompletion, 30, ARBITRARY_NOW);

    expect(after.completionRate, 'completionRate must change once a step completes').not.toBe(before.completionRate);
    expect(
      after.completionRate,
      'completionRate must equal the §13 formula result for the new state, not an arbitrary different number',
    ).toBe(expected.rate);
  });
});
