import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveSection, lostToFollowUp } from '../src/logic';
import type { Id, StepStatus, WorkStep } from '../src/types';

// PRD §10.5 (ITEM-6-TEST-CASES.md TC-CFG-003). Item 3 made the unreachable
// threshold a call-site parameter, and §13/§21 list the lost-to-follow-up
// window as a value clinicians will tune during review — neither may
// require a code edit. Both `deriveSection` and `lostToFollowUp` already
// accept a threshold explicitly (so the worklist/metric plumbing itself is
// fine); what's missing is the piece that resolves those numbers from a
// clinic's profile instead of the documented defaults of 3 and 30. No
// `../src/profile` module exists yet, so a static import here would fail at
// collection time, before any test runs, and the file would register zero
// assertions. Importing dynamically inside the test body instead defers
// that same failure to runtime, where it surfaces as the named assertions
// below (same technique as TC-FHIR-001, TC-ID-003).
interface ProgrammeProfile {
  unreachableThreshold?: number;
  lostToFollowUpDays?: number;
}

type GetUnreachableThreshold = (profile?: ProgrammeProfile) => number;
type GetLostToFollowUpDays = (profile?: ProgrammeProfile) => number;

const NOW = new Date('2026-06-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const profile: ProgrammeProfile = { unreachableThreshold: 4, lostToFollowUpDays: 45 };

function fixtureStep(attempts: number, dueDate: Date, status: StepStatus = 'SCHEDULED'): WorkStep {
  return {
    id: 's-cfg-003',
    pid: 'p-cfg-003',
    visitId: 'v-cfg-003',
    name: 'Fixture step',
    cat: 'FOLLOW_UP_CALL',
    detail: '',
    dueDate,
    priority: 'NORMAL',
    delivery: '—',
    attempts,
    status,
  };
}

interface MetricPatient {
  patientId: Id;
  steps: { dueDate: Date; status: StepStatus; attempts: number }[];
  lastVisitDate: Date;
}

describe('TC-CFG-003 — thresholds come from the profile (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves unreachableThreshold and lostToFollowUpDays from the profile, not the documented defaults', async () => {
    let getUnreachableThreshold: GetUnreachableThreshold | undefined;
    let getLostToFollowUpDays: GetLostToFollowUpDays | undefined;
    try {
      ({ getUnreachableThreshold, getLostToFollowUpDays } = (await import('../src/profile')) as unknown as {
        getUnreachableThreshold: GetUnreachableThreshold;
        getLostToFollowUpDays: GetLostToFollowUpDays;
      });
    } catch {
      getUnreachableThreshold = undefined;
      getLostToFollowUpDays = undefined;
    }

    const resolvedThreshold = getUnreachableThreshold?.(profile);
    const resolvedDays = getLostToFollowUpDays?.(profile);

    expect(resolvedThreshold, 'must read unreachableThreshold from the profile, not the documented default of 3').toBe(
      4,
    );
    expect(resolvedDays, 'must read lostToFollowUpDays from the profile, not the documented default of 30').toBe(45);

    // Worklist section membership: 3 failed attempts is below the profile's
    // threshold of 4, so it must not qualify as unreachable — but it does
    // qualify against the hardcoded default of 3, which is what happens
    // today because `resolvedThreshold` is undefined.
    const dueTodayStep = fixtureStep(3, NOW);
    const section = deriveSection(dueTodayStep, resolvedThreshold, NOW);
    expect(
      section,
      'attempts (3) below the profile threshold (4) must not put the step in the unreachable section',
    ).not.toBe('unreach');

    // Lost-to-follow-up: 50 days overdue exceeds the profile's 45-day
    // window (so it must count), but it does not exceed the hardcoded
    // default's comparison once `resolvedDays` is undefined — the
    // comparison silently never matches.
    const lostPatient: MetricPatient = {
      patientId: 'p-cfg-003-lost',
      steps: [{ dueDate: daysAgo(50), status: 'SCHEDULED', attempts: 5 }],
      lastVisitDate: daysAgo(60),
    };
    const lostCount = lostToFollowUp(
      [lostPatient],
      { threshold: resolvedThreshold as number, lostToFollowUpDays: resolvedDays as number },
      NOW,
    );
    expect(lostCount, 'a step 50 days overdue exceeds the profile\'s 45-day window and must count as lost').toBe(1);
  });
});
