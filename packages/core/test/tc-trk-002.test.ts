import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ArrivalRow } from '../src/engine';
import type { ProgrammeProfile } from '../src/profile';
import type { Id, Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-6, NS-7 (batch 8c — TC-TRK-002).
//
// Escalation does not exist (no `escalationCount`, no escalation clock), and
// neither does a tracking-outcome recorder. This test hypothesizes both: an
// `escalationWindowDays` field on `ProgrammeProfile` (following the naming
// convention of the profile's other day-count fields, `lostToFollowUpDays`)
// and a `recordTrackingOutcome` method, reached only through optional
// chaining on a cast engine. The real, already-shipped pieces —
// `raiseReferral`, `arrivalWorklist`, `getReferral`, `worklist` — are called
// for real throughout, with vitest fake timers (the house convention, e.g.
// tc-ref-002.test.ts) pinning and advancing the clock. Every comparison is
// against a real return value, including `undefined` ones reached through
// `?.` — nothing here throws or is caught.

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type EscalationProfile = ProgrammeProfile & { escalationWindowDays?: number };
type TrackedReferral = Referral & { escalationCount?: number };
type ArrivalRowWithStatus = ArrivalRow & { status?: 'PENDING' | 'OVERDUE' | 'RESOLVED' };

type EngineWithTracking = InMemoryCoordinationEngine & {
  getReferral(referralId: Id): Promise<TrackedReferral | undefined>;
  recordTrackingOutcome?(
    referralId: Id,
    input: { outcome: 'COMPLETED_PRIVATE_FACILITY'; privateFollowUpDate?: Date },
    context: RoleContext,
  ): Promise<TrackedReferral>;
};

const hrpProfile: EscalationProfile = { escalationWindowDays: 2 };

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };
const dhContext: RoleContext = { role: 'DH_SN', facilityId: 'FAC-DH-001' };

describe('TC-TRK-002 — private completion resolves and alerts (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with PRIVATE_FACILITY, clears the DH arrival worklist, and alerts the ANM to schedule follow-up', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: hrpProfile }) as EngineWithTracking;

    const patient = await engine.createPatient({
      name: 'Private Completion Patient',
      mobile: '+919800002001',
      gender: 'Female',
      age: 29,
      cid: 'Private Completion Patient',
      consent: true,
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const referral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // Given: escalated once, i.e. the profile's 2-day window has passed once.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + hrpProfile.escalationWindowDays! * DAY_MS));
    const escalatedOnce = await engine.getReferral(referral.id);
    expect(
      escalatedOnce?.escalationCount,
      'NS-8: after one escalation window the referral must have escalated once — no escalation mechanism exists',
    ).toBe(1);

    // When: an ASHA records "completed — private facility".
    const outcomeResult = await engine.recordTrackingOutcome?.(
      referral.id,
      { outcome: 'COMPLETED_PRIVATE_FACILITY' },
      ashaContext,
    );
    expect(
      outcomeResult,
      'NS-7: recording "completed — private facility" must be accepted — recordTrackingOutcome does not exist',
    ).toBeDefined();

    // Then: the referral resolves with PRIVATE_FACILITY.
    const resolved = await engine.getReferral(referral.id);
    expect(resolved?.status, 'NS-7: a completed tracking outcome must resolve the referral').toBe('COMPLETED');
    expect(
      resolved?.completionLocation,
      'NS-6/NS-7: the resolved location must be PRIVATE_FACILITY',
    ).toBe('PRIVATE_FACILITY');

    // It leaves the DH arrival worklist.
    const dhWorklist = (await engine.arrivalWorklist(dhContext)) as ArrivalRowWithStatus[];
    expect(
      dhWorklist.some((row) => row.id === referral.id),
      'NS-7: once private completion is recorded, the referral must leave the DH arrival worklist',
    ).toBe(false);

    // The ANM receives an alert to schedule private-provider follow-up — no
    // date was supplied, so the alert is the ANM's private-care worklist
    // carrying this patient.
    const anmPrivateCareDue = await engine.worklist(anmContext, 'PRIVATE_CARE_DUE');
    expect(
      anmPrivateCareDue.some((row) => row.id === patient.id),
      'NS-7/NS-15: the ANM must be alerted to schedule private-provider follow-up on her private-care worklist',
    ).toBe(true);
  });
});
