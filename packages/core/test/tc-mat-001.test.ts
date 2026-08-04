import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UNREACHABLE_THRESHOLD,
  clinicDayIndex,
  decorate,
  deriveSection,
  orderSection,
} from '../src/logic';
import type { ProgrammeProfile } from '../src/profile';
import type { Category, StepStatus } from '../src/types';

// PRD FR-A-6.1 (ITEM-6-TEST-CASES.md TC-MAT-001). Item 6c claims a maternal
// programme profile and its own seed clinic can be loaded and produce a
// worklist exactly as FR-A-6.1 describes. Neither `../src/maternalProfile`
// nor `../src/maternalSeed` exists yet — this test documents the shape both
// must have. Both are imported dynamically inside the test body (same
// technique as TC-CFG-004/005): a static import of a missing module fails
// at collection time, before any test runs, registering zero assertions;
// a dynamic import defers that failure to runtime, where it surfaces as the
// named assertions below.

interface MaternalWorkStep {
  id: string;
  pid: string;
  name: string;
  cat: Category;
  detail: string;
  dueDate: Date;
  priority: 'NORMAL' | 'HIGH';
  delivery: string;
  attempts: number;
  status: StepStatus;
  completedDate?: Date | null;
}

describe('TC-MAT-001 — the maternal profile produces a valid worklist (EXPECTED FAIL)', () => {
  it('populates Overdue, Due today, Due soon, Unreachable and Completed today from the maternal profile and its seed clinic', async () => {
    let MATERNAL_PROFILE: ProgrammeProfile | undefined;
    let MATERNAL_WORK: MaternalWorkStep[] | undefined;
    try {
      ({ MATERNAL_PROFILE } = (await import('../src/maternalProfile')) as unknown as {
        MATERNAL_PROFILE: ProgrammeProfile;
      });
    } catch {
      MATERNAL_PROFILE = undefined;
    }
    try {
      ({ MATERNAL_WORK } = (await import('../src/maternalSeed')) as unknown as {
        MATERNAL_WORK: MaternalWorkStep[];
      });
    } catch {
      MATERNAL_WORK = undefined;
    }

    expect(MATERNAL_PROFILE, 'a maternal programme profile must exist (../src/maternalProfile)').toBeDefined();
    expect(MATERNAL_WORK, 'a maternal seed clinic work list must exist (../src/maternalSeed)').toBeDefined();

    const steps = MATERNAL_WORK ?? [];
    const now = new Date();
    const threshold = MATERNAL_PROFILE?.unreachableThreshold ?? DEFAULT_UNREACHABLE_THRESHOLD;

    const bySection: Record<'overdue' | 'today' | 'soon' | 'unreach', MaternalWorkStep[]> = {
      overdue: [],
      today: [],
      soon: [],
      unreach: [],
    };
    for (const step of steps) {
      const section = deriveSection(step, threshold, now);
      if (section) bySection[section].push(step);
    }
    const completedToday = steps.filter(
      (s) =>
        s.status === 'COMPLETED' &&
        s.completedDate != null &&
        clinicDayIndex(s.completedDate) === clinicDayIndex(now),
    );

    // The load-bearing population check: a stage demo reads an empty
    // section as a broken app, so each of the five must have >= 1 step.
    expect(bySection.overdue.length, 'the maternal worklist must have at least one Overdue step').toBeGreaterThan(0);
    expect(bySection.today.length, 'the maternal worklist must have at least one step Due today').toBeGreaterThan(0);
    expect(bySection.soon.length, 'the maternal worklist must have at least one step Due soon').toBeGreaterThan(0);
    expect(bySection.unreach.length, 'the maternal worklist must have at least one Unreachable step').toBeGreaterThan(
      0,
    );
    expect(completedToday.length, 'the maternal worklist must have at least one step Completed today').toBeGreaterThan(
      0,
    );

    // BR-014, unchanged: within a non-unreachable section, HIGH priority
    // must order before NORMAL priority.
    const orderedOverdue = orderSection(
      bySection.overdue.map((w) => decorate(w, now, MATERNAL_PROFILE)),
      false,
    );
    const highIndices = orderedOverdue.flatMap((s, i) => (s.priority === 'HIGH' ? [i] : []));
    const normalIndices = orderedOverdue.flatMap((s, i) => (s.priority === 'NORMAL' ? [i] : []));
    const maxHigh = highIndices.length ? Math.max(...highIndices) : -1;
    const minNormal = normalIndices.length ? Math.min(...normalIndices) : Infinity;
    expect(
      maxHigh,
      'BR-014: within the Overdue section, every HIGH priority step must order before every NORMAL priority step',
    ).toBeLessThan(minNormal);
  });
});
