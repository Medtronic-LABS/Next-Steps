import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

// Demo integrity, not a spec clause: the completed list and the
// completion-rate metric describe the same underlying state and must agree.
// seed.ts's DONE_BASE hardcodes two "completed earlier today" rows that are
// not backed by any WorkStep — they carry no id, no dueDate, no status, and
// so cannot be counted by `completionRate` in logic.ts. The seed clinic's
// ten WorkSteps are all SCHEDULED, so §13 completion rate correctly reports
// zero completions (0 of 7 eligible), while doneRows() reports two,
// because inMemoryEngine.ts's doneRows() prepends `seedClinic.doneBase`
// unconditionally. A demo screen showing "2 completed today" beside a
// "0% completion rate" card is the kind of inconsistency that erodes trust
// in every other figure on the same screen.
describe('TC-SEED-002 — the completed list agrees with the completion-rate metric', () => {
  it('doneRows() reports no completions when the completion-rate metric counts none', async () => {
    const engine = new InMemoryCoordinationEngine();

    const insights = await engine.insights(30);
    const done = await engine.doneRows();

    expect(
      insights.completionOf,
      'seed clinic ships with all ten steps SCHEDULED, none COMPLETED',
    ).toBe('0 of 7');

    expect(
      done.length,
      'doneRows() must not report completions the completion-rate metric does not count',
    ).toBe(0);
  });
});
