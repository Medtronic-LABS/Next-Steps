import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ArrivalRow, WorklistRow } from '../src/engine';
import type { Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-15 (batch 8c — TC-TRK-007).
//
// No tracking-outcome recorder exists, so there is no capture point at
// which a private follow-up date could be supplied, and no follow-up
// commitment it could create. This test hypothesizes `recordTrackingOutcome`
// taking an optional `privateFollowUpDate`, reached only through optional
// chaining on a cast engine — the call resolves to `undefined` and never
// throws. `arrivalWorklist` and `worklist(context, 'PRIVATE_CARE_DUE')` are
// real, already-shipped methods; today the latter always answers empty
// (packages/core/src/inMemoryEngine.ts's worklist `switch` has no case for
// it yet), so the mismatch below is a genuine empty-array comparison.

type TrackedReferral = Referral & Record<string, unknown>;

type EngineWithTracking = InMemoryCoordinationEngine & {
  recordTrackingOutcome?(
    referralId: string,
    input: { outcome: 'COMPLETED_PRIVATE_FACILITY'; privateFollowUpDate?: Date },
    context: RoleContext,
  ): Promise<TrackedReferral>;
};

type ArrivalRowWithStatus = ArrivalRow & { status?: 'PENDING' | 'OVERDUE' | 'RESOLVED' };
type WorklistRowWithDueDate = WorklistRow & { dueDate?: Date };

const FOLLOW_UP_DATE = new Date('2026-08-20T00:00:00Z');

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };
const dhContext: RoleContext = { role: 'DH_SN', facilityId: 'FAC-DH-001' };

describe('TC-TRK-007 — private closure with a date creates an ordinary commitment (EXPECTED FAIL)', () => {
  it('resolves with PRIVATE_FACILITY, leaves the DH worklist, and creates exactly one dated commitment — no discovery commitment', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithTracking;

    const patient = await engine.createPatient({
      name: 'Private With Date Patient',
      mobile: '+919800007001',
      gender: 'Female',
      age: 25,
      cid: 'Private With Date Patient',
      consent: true,
      ashaName: 'Asha One',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const referral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    const outcomeResult = await engine.recordTrackingOutcome?.(
      referral.id,
      { outcome: 'COMPLETED_PRIVATE_FACILITY', privateFollowUpDate: FOLLOW_UP_DATE },
      ashaContext,
    );
    expect(
      outcomeResult,
      'NS-7/NS-15: recording private completion with a supplied follow-up date must be accepted — recordTrackingOutcome does not exist',
    ).toBeDefined();

    const resolved = await engine.getReferral(referral.id);
    expect(resolved?.status, 'NS-7: the referral must resolve').toBe('COMPLETED');
    expect(
      resolved?.completionLocation,
      'NS-6/NS-7: the resolved location must be PRIVATE_FACILITY',
    ).toBe('PRIVATE_FACILITY');

    const dhWorklist = (await engine.arrivalWorklist(dhContext)) as ArrivalRowWithStatus[];
    expect(
      dhWorklist.some((row) => row.id === referral.id),
      'NS-7: the referral must leave the DH arrival worklist once resolved',
    ).toBe(false);

    // One follow-up commitment exists, due on the supplied date, and
    // appears in the private-care filter — not a discovery commitment.
    const privateCareDue = (await engine.worklist(anmContext, 'PRIVATE_CARE_DUE')) as WorklistRowWithDueDate[];
    expect(
      privateCareDue.length,
      'NS-15: exactly one follow-up commitment must appear in the private-care filter — it always answers empty today',
    ).toBe(1);
    expect(
      privateCareDue[0]?.dueDate,
      'NS-15: the follow-up commitment must be due on the date the private provider advised, not a discovery-window default',
    ).toEqual(FOLLOW_UP_DATE);

    // No discovery commitment was created — TRACKING_NEEDED stays clear of
    // this patient (unlike TC-TRK-008, where no date is supplied).
    const trackingNeeded = await engine.worklist(anmContext, 'TRACKING_NEEDED');
    expect(
      trackingNeeded.some((row) => row.id === patient.id),
      'NS-15: supplying a follow-up date must not also raise a discovery commitment for the same patient',
    ).toBe(false);
  });
});
