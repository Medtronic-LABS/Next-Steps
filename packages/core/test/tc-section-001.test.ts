import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

// engine.sections() returns a plain object built as a single object literal
// (overdue, today, soon, unreach, upcoming, in that source order), so
// Object.keys() reproduces the engine's own section order without needing to
// touch any UI code. "Completed today" isn't part of that object at all — it
// comes from the separate doneRows() call — so it's appended here as its own
// pseudo-section when there are rows to show.
const SECTION_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  soon: 'Due soon (next 7 days)',
  unreach: 'Unreachable',
};

describe('TC-SECTION-001 — FR-A-6.1 worklist sections match the spec (EXPECTED FAIL)', () => {
  it('has exactly five sections, in order: Overdue, Due today, Due soon, Unreachable, Completed today', async () => {
    const engine = new InMemoryCoordinationEngine();
    const sections = await engine.sections('all');
    const done = await engine.doneRows();

    const built = [
      ...Object.keys(sections).map((key) => SECTION_LABELS[key] ?? key),
      ...(done.length > 0 ? ['Completed today'] : []),
    ];

    expect(built).toEqual([
      'Overdue',
      'Due today',
      'Due soon (next 7 days)',
      'Unreachable',
      'Completed today',
    ]);
  });
});
