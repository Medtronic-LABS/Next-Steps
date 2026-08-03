import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InMemoryCoordinationEngine as InMemoryCoordinationEngineType } from '../src/inMemoryEngine';
import { clinicDayIndex } from '../src/logic';

// Demo integrity, not a spec clause: seed due dates must be offsets from
// "today" (seed.ts's `daysFromNow`), never absolute calendar dates baked in
// at authoring time — the bug this replaced hardcoded '28 Jun' against a
// TODAY_LABEL of 'Monday, 6 July'. This asserts it at an arbitrary system
// date far from whenever this suite happens to run, so it can't pass by
// coincidence of "today" matching the seed author's assumed date.
// vi.resetModules() + a dynamic import are required because seed.ts
// computes every WorkStep's dueDate once, at module-evaluation time, via
// `daysFromNow(Date.now())` — a static top-of-file import would freeze
// those dates to whatever the real clock read when this test file was
// first loaded, before fake timers were ever installed.
const ARBITRARY_NOW = new Date('2030-10-15T09:00:00.000Z');

describe('TC-SEED-001 — seed dates are relative to today, on any system date', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(ARBITRARY_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('every worklist section and the completed list is non-empty', async () => {
    const { InMemoryCoordinationEngine } = await import('../src/inMemoryEngine');
    const engine: InMemoryCoordinationEngineType = new InMemoryCoordinationEngine();

    const sections = await engine.sections('all');
    const done = await engine.doneRows();

    expect(sections.overdue.length, 'expected at least one overdue seed step').toBeGreaterThan(0);
    expect(sections.today.length, 'expected at least one seed step due today').toBeGreaterThan(0);
    expect(sections.soon.length, 'expected at least one seed step due soon').toBeGreaterThan(0);
    expect(sections.unreach.length, 'expected at least one unreachable seed step').toBeGreaterThan(0);
    expect(done.length, 'expected at least one completed row').toBeGreaterThan(0);

    // Bind section membership to dueDate so this can't pass on a stale
    // stored `section` field alone (§11.3: section is derived from dueDate,
    // never stored — see tc-sect-001.test.ts).
    const todayIndex = clinicDayIndex(ARBITRARY_NOW);

    for (const step of sections.overdue) {
      expect(
        clinicDayIndex(step.dueDate),
        `overdue step ${step.id} must have a dueDate strictly before today in clinic time`,
      ).toBeLessThan(todayIndex);
    }

    for (const step of sections.today) {
      expect(
        clinicDayIndex(step.dueDate),
        `today step ${step.id} must have a dueDate equal to today in clinic time`,
      ).toBe(todayIndex);
    }

    for (const step of sections.soon) {
      const dueIndex = clinicDayIndex(step.dueDate);
      expect(
        dueIndex,
        `soon step ${step.id} must have a dueDate after today in clinic time`,
      ).toBeGreaterThan(todayIndex);
      expect(
        dueIndex,
        `soon step ${step.id} must have a dueDate within the next 7 days (inclusive) in clinic time`,
      ).toBeLessThanOrEqual(todayIndex + 7);
    }
  });
});
