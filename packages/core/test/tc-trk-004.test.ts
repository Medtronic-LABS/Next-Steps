import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ProgrammeProfile } from '../src/profile';
import type { Id, Referral, Role, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-8 (batch 8c — TC-TRK-004).
//
// No escalation mechanism exists: no `escalationCount`, no alert routing, no
// patient reminder. This test hypothesizes an `escalationWindowDays` field
// on `ProgrammeProfile` (naming convention borrowed from its existing
// `lostToFollowUpDays`), an `escalationCount` field on `Referral`, and two
// query methods — `escalationAlerts` and `patientReminderScheduled` — that
// would let a caller confirm who was notified. All three are reached only
// through optional chaining on a cast engine, so they resolve to `undefined`
// and never throw; `raiseReferral` and `getReferral` are the real,
// already-shipped methods, driven with vitest fake timers (house
// convention, e.g. tc-ref-002.test.ts).

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type EscalationProfile = ProgrammeProfile & { escalationWindowDays?: number };
type TrackedReferral = Referral & { escalationCount?: number };

interface EscalationAlert {
  referralId: Id;
  recipientRole: Role;
  ashaName?: string;
}

type EngineWithEscalation = InMemoryCoordinationEngine & {
  getReferral(referralId: Id): Promise<TrackedReferral | undefined>;
  escalationAlerts?(referralId: Id): Promise<EscalationAlert[]>;
  patientReminderScheduled?(referralId: Id): Promise<boolean>;
};

const hrpProfile: EscalationProfile = { escalationWindowDays: 2 };

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

describe('TC-TRK-004 — escalation notifies both ASHA and ANM (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('alerts the linked ASHA and the ANM, schedules a patient reminder, and sets escalationCount to 1', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: hrpProfile }) as EngineWithEscalation;

    const patient = await engine.createPatient({
      name: 'Escalation Alert Patient',
      mobile: '+919800004001',
      gender: 'Female',
      age: 28,
      cid: 'Escalation Alert Patient',
      consent: true,
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const referral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // When: the profile's escalation window passes.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + hrpProfile.escalationWindowDays! * DAY_MS));
    const escalated = await engine.getReferral(referral.id);

    expect(
      escalated?.escalationCount,
      'NS-8: escalationCount must become 1 once the escalation window passes — no escalation mechanism exists',
    ).toBe(1);

    const alerts = await engine.escalationAlerts?.(referral.id);
    expect(
      alerts?.some((a) => a.recipientRole === 'ASHA' && a.ashaName === 'Asha One'),
      'NS-8: escalation must alert the specific linked ASHA, not a role in the abstract — escalationAlerts does not exist',
    ).toBe(true);
    expect(
      alerts?.some((a) => a.recipientRole === 'ANM_CHO'),
      'NS-8: escalation must alert the ANM/CHO as well as the ASHA',
    ).toBe(true);

    const reminderScheduled = await engine.patientReminderScheduled?.(referral.id);
    expect(
      reminderScheduled,
      'NS-8: escalation must also schedule a reminder to the patient or family',
    ).toBe(true);
  });
});
