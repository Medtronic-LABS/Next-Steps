import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority, WorkStep } from '../src/types';

// FR-A-6.1, §11.3: worklist section membership must be derived from
// dueDate (and status/attempts) on every read, exactly like
// isOverdue/daysOverdue (§11.1, already fixed — see tc-over-00x.test.ts).
// Today it is the opposite: `section` is a field set once at capture time
// (SECTION_BY_DUE[dueKey] in inMemoryEngine.ts) and never recomputed, so a
// step frozen into "soon" at capture stays there forever even once its due
// date is long past — the same mistake TC-OVER-003 caught for `over`, one
// level up. `dueDate` is passed on the capture input below so the call
// doesn't also fail on the real recordVisit's BR-005 dueKey validation
// (matches tc-over-001.test.ts); the real engine ignores it for date math
// but still uses `dueKey` alone to freeze `section`.
interface StepCaptureInput {
  cat: Category;
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  dueDate: Date;
  priority: Priority;
}

type RecordVisitFn = (
  patientId: Id,
  steps: StepCaptureInput[],
  options?: { doctorId?: Id; createdBy?: Id },
) => Promise<{ stepIds: Id[] }>;

const DAY_MS = 24 * 60 * 60 * 1000;
const TODAY = new Date('2026-06-20T12:00:00.000Z');
const DUE_TOMORROW = new Date(TODAY.getTime() + DAY_MS);

function withoutDerivedOverdueFields(step: WorkStep | undefined): Record<string, unknown> {
  const clone = { ...(step as unknown as Record<string, unknown>) };
  delete clone.isOverdue;
  delete clone.daysOverdue;
  return clone;
}

describe('TC-SECT-001 — FR-A-6.1, §11.3 section is derived, not stored (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a step due tomorrow moves from Due soon into Overdue two days later, with no write in between, and section is not a persisted field', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', dueDate: DUE_TOMORROW, priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const id = stepIds[0];

    const before = await engine.sections('all');
    expect(before.soon.map((s) => s.id), 'newly captured step due tomorrow should start in Due soon').toContain(id);
    expect(before.overdue.map((s) => s.id), 'it should not start in Overdue').not.toContain(id);

    const beforeStep = await engine.getStep(id);

    vi.setSystemTime(new Date(TODAY.getTime() + 2 * DAY_MS));

    const after = await engine.sections('all');
    expect(after.overdue.map((s) => s.id), 'two days later the same step should have moved into Overdue').toContain(
      id,
    );
    expect(after.soon.map((s) => s.id), 'it should no longer be in Due soon').not.toContain(id);

    const afterStep = await engine.getStep(id);
    expect(
      withoutDerivedOverdueFields(afterStep),
      'no field except the derived overdue flags should change on a pure read',
    ).toEqual(withoutDerivedOverdueFields(beforeStep));

    expect(
      'section' in (afterStep as unknown as Record<string, unknown>),
      'section must not exist as a persisted field (FR-A-6.1, §11.3)',
    ).toBe(false);
  });
});
