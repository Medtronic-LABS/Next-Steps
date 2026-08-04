import { describe, expect, it } from 'vitest';
import { completionRate, medianDaysToCompletion, onTimeCompletionRate, overdueBuckets } from '../src/logic';
import type { ProgrammeProfile } from '../src/profile';
import type { Id, StepStatus } from '../src/types';

// PRD §13 (ITEM-6-TEST-CASES.md TC-MAT-003). §13's formulas must be
// programme-independent: `completionRate`, `onTimeCompletionRate`,
// `medianDaysToCompletion` and `overdueBuckets` (../src/logic.ts) take no
// profile, label or condition as input, by construction. What item 6c adds
// is a second profile to prove that claim against — `../src/maternalProfile`
// does not exist yet, so it is imported dynamically inside the test body
// (same technique as TC-CFG-004/005): a static import of a missing module
// fails at collection time, before any test runs, registering zero
// assertions; a dynamic import defers that failure to runtime, where it
// surfaces as the named assertions below.

interface MetricStep {
  id: Id;
  cat: string;
  visitDate: Date;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
}

const NOW = new Date('2026-08-04T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

/** Identical coordination shape — same due dates, statuses and completion dates — used under both profiles. */
function buildFixture(): MetricStep[] {
  return [
    { id: 's1', cat: 'FOLLOW_UP_VISIT', visitDate: d('2026-06-01'), dueDate: d('2026-07-01'), status: 'COMPLETED', completedDate: d('2026-06-28') },
    { id: 's2', cat: 'LAB_INVESTIGATION', visitDate: d('2026-06-01'), dueDate: d('2026-07-10'), status: 'COMPLETED', completedDate: d('2026-07-14') },
    { id: 's3', cat: 'SPECIALIST_REFERRAL', visitDate: d('2026-06-01'), dueDate: d('2026-07-20'), status: 'SCHEDULED' },
    { id: 's4', cat: 'FOLLOW_UP_CALL', visitDate: d('2026-06-01'), dueDate: d('2026-07-25'), status: 'SCHEDULED' },
    { id: 's5', cat: 'OTHER', visitDate: d('2026-06-01'), dueDate: d('2026-05-01'), status: 'SCHEDULED' },
    { id: 's6', cat: 'FOLLOW_UP_VISIT', visitDate: d('2026-06-01'), dueDate: d('2026-07-30'), status: 'DECLINED' },
  ];
}

describe('TC-MAT-003 — §13 metrics compute identically under either profile (EXPECTED FAIL)', () => {
  it('gives identical completion rate, on-time rate, median days to completion and overdue buckets for identical coordination shape under the diabetes default and the maternal profile', async () => {
    let MATERNAL_PROFILE: ProgrammeProfile | undefined;
    try {
      ({ MATERNAL_PROFILE } = (await import('../src/maternalProfile')) as unknown as {
        MATERNAL_PROFILE: ProgrammeProfile;
      });
    } catch {
      MATERNAL_PROFILE = undefined;
    }

    expect(MATERNAL_PROFILE, 'a maternal programme profile must exist (../src/maternalProfile)').toBeDefined();

    // The diabetes deployment's default profile is the documented catalog.ts
    // defaults — i.e. no overrides.
    const diabetesFixture = buildFixture();
    const maternalFixture = buildFixture();
    const periodDays = 90;

    const diabetesCompletion = completionRate(diabetesFixture, periodDays, NOW);
    const maternalCompletion = completionRate(maternalFixture, periodDays, NOW);
    expect(
      maternalCompletion,
      '§13 completion rate must be identical under the maternal profile for identical coordination shape',
    ).toEqual(diabetesCompletion);

    const diabetesOnTime = onTimeCompletionRate(diabetesFixture, periodDays, NOW);
    const maternalOnTime = onTimeCompletionRate(maternalFixture, periodDays, NOW);
    expect(
      maternalOnTime,
      '§13 on-time completion rate must be identical under the maternal profile for identical coordination shape',
    ).toEqual(diabetesOnTime);

    const diabetesMedian = medianDaysToCompletion(diabetesFixture, periodDays, NOW);
    const maternalMedian = medianDaysToCompletion(maternalFixture, periodDays, NOW);
    expect(
      maternalMedian,
      '§13 median days to completion (overall and by category) must be identical under the maternal profile for identical coordination shape',
    ).toEqual(diabetesMedian);

    const diabetesBuckets = overdueBuckets(diabetesFixture, NOW);
    const maternalBuckets = overdueBuckets(maternalFixture, NOW);
    expect(
      maternalBuckets,
      '§13 overdue buckets must be identical under the maternal profile for identical coordination shape',
    ).toEqual(diabetesBuckets);
  });
});
