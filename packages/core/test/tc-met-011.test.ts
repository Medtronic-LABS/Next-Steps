import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { referralCompletionRateBySpecialty } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13, BR-019 — "Referral completion rate: As completion rate, category =
// SPECIALIST_REFERRAL, split by specialty only — never by named
// destination." Aggregating on destination turns Next Steps into a
// specialist-ranking tool, which BR-019 and §3.3 forbid.
// `referralCompletionRateBySpecialty` does not exist yet, so this import
// is expected to fail.

interface MetricStep {
  id: Id;
  specialty: string;
  destination: string;
  dueDate: Date;
  status: StepStatus;
}

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

const STEPS: MetricStep[] = [
  { id: 'r1', specialty: 'NEPHROLOGY', destination: "Dr Rao's clinic", dueDate: d('2026-06-05'), status: 'COMPLETED' },
  { id: 'r2', specialty: 'NEPHROLOGY', destination: 'City Kidney Centre', dueDate: d('2026-06-08'), status: 'SCHEDULED' },
  { id: 'r3', specialty: 'OPHTHALMOLOGY', destination: 'Some Eye Centre', dueDate: d('2026-06-10'), status: 'COMPLETED' },
  { id: 'r4', specialty: 'OPHTHALMOLOGY', destination: 'Other Eye Centre', dueDate: d('2026-06-11'), status: 'DECLINED' },
];

describe('TC-MET-011 — §13/BR-019 referral completion splits by specialty, never by destination (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups on NEPHROLOGY and OPHTHALMOLOGY only, with no destination string anywhere in the result', () => {
    const result = referralCompletionRateBySpecialty(STEPS, 30);

    expect(Object.keys(result).sort()).toEqual(['NEPHROLOGY', 'OPHTHALMOLOGY']);

    const serialized = JSON.stringify(result);
    expect(serialized.includes("Dr Rao"), 'no destination string leaks into the result').toBe(false);
    expect(serialized.includes('City Kidney'), 'no destination string leaks into the result').toBe(false);
    expect(serialized.includes('Eye Centre'), 'no destination string leaks into the result').toBe(false);
  });
});
