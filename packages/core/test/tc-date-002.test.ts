import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §10/FR-A-6.4: the display label shown on a step ('Today', '19 Jun', '28
// Jul', ...) must be computed from `dueDate` at read time, never stored.
// Today's `dueLabel` (logic.ts decorate()) is computed from the stored `due`
// display string instead, so it cannot reflect a caller-supplied dueDate at
// all — this is written against the required behaviour. `dueDate` is
// included on the capture input below so the call doesn't also fail on the
// real recordVisit's BR-005 dueKey validation (matches tc-visit-001.test.ts);
// the real engine ignores it.
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

interface DecoratedDueLabel {
  id: Id;
  dueLabel?: string;
}

// Noon IST on each date, well clear of any day-boundary edge (that's TC-OVER-004/005).
const TODAY_NOON_IST = new Date('2026-06-20T06:30:00.000Z');
const DUE_TODAY = new Date('2026-06-20T06:30:00.000Z');
const DUE_YESTERDAY = new Date('2026-06-19T06:30:00.000Z');
const DUE_FUTURE = new Date('2026-07-28T06:30:00.000Z');

describe('TC-DATE-002 — §10, FR-A-6.4 display labels are derived from dueDate (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY_NOON_IST);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels a step due today as "Today", yesterday as "19 Jun", and a future date as "28 Jul"', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };

    const { stepIds } = await call.recordVisit(
      'p1',
      [
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_TODAY, priority: 'NORMAL' },
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_YESTERDAY, priority: 'NORMAL' },
        { cat: 'OTHER', dueKey: '1w', dueDate: DUE_FUTURE, priority: 'NORMAL' },
      ],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const [todayId, yesterdayId, futureId] = stepIds;

    const decorated = (await engine.openStepsForPatient('p1')) as unknown as DecoratedDueLabel[];
    const byId = new Map(decorated.map((d) => [d.id, d.dueLabel]));

    expect(byId.get(todayId)).toBe('Today');
    expect(byId.get(yesterdayId)).toBe('19 Jun');
    expect(byId.get(futureId)).toBe('28 Jul');
  });
});
