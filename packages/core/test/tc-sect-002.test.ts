import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// FR-A-6.1: "Due soon" is a 7-day-ahead window from today; a step due on
// day 8 belongs in no section at all — `upcoming`/`future` were removed in
// favour of FR-A-6.1's exact five sections. Today's engine ignores the
// actual dueDate for bucketing entirely: `sections()` reads the `section`
// field set once at capture from SECTION_BY_DUE[dueKey] (inMemoryEngine.ts),
// so any dueKey mapped to 'soon' lands every step in Due soon regardless of
// how far out its real due date is — a day 8 step captured with dueKey
// '1w' sits in Due soon forever. `dueDate` is passed on the capture input
// below so the call doesn't also fail on the real recordVisit's BR-005
// dueKey validation (matches tc-over-001.test.ts); the real engine ignores
// it for date math.
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
const DUE_DAY_1 = new Date(TODAY.getTime() + 1 * DAY_MS);
const DUE_DAY_7 = new Date(TODAY.getTime() + 7 * DAY_MS);
const DUE_DAY_8 = new Date(TODAY.getTime() + 8 * DAY_MS);

describe('TC-SECT-002 — FR-A-6.1 due soon window (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('day 1 and day 7 are in Due soon; day 8 is in no section', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_DAY_1, priority: 'NORMAL' },
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_DAY_7, priority: 'NORMAL' },
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_DAY_8, priority: 'NORMAL' },
      ],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const [day1Id, day7Id, day8Id] = stepIds;

    const sections = await engine.sections('all');
    const soonIds = sections.soon.map((s) => s.id);
    const everySectionId = [
      ...sections.overdue.map((s) => s.id),
      ...sections.today.map((s) => s.id),
      ...sections.soon.map((s) => s.id),
      ...sections.unreach.map((s) => s.id),
    ];

    expect(soonIds, 'due in 1 day should be in Due soon').toContain(day1Id);
    expect(soonIds, 'due in 7 days (the far edge of the window) should be in Due soon').toContain(day7Id);
    expect(
      everySectionId,
      'due in 8 days is beyond the 7-day window and belongs in no section',
    ).not.toContain(day8Id);
  });
});
