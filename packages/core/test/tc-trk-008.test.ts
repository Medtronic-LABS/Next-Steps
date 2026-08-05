import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ArrivalRow, WorklistFilter } from '../src/engine';
import type { Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-15 (batch 8c — TC-TRK-008).
//
// No tracking-outcome recorder and no discovery-commitment mechanism exist.
// This is the case NS-15 itself calls out as the one the product exists to
// prevent: closing the referral privately, with no follow-up date, must not
// make the patient invisible to every worklist the ANM actually works from.
// `recordTrackingOutcome` is reached only through optional chaining on a
// cast engine — the call resolves to `undefined` and never throws.
// `worklist()` is the real, already-shipped method; every one of the six
// state-driven filters checked below currently answers empty
// unconditionally (packages/core/src/inMemoryEngine.ts's worklist `switch`
// has no case for any of them yet), so the failure is a genuine empty-result
// comparison.
//
// `ALL_REGISTERED` is deliberately excluded from the "at least one filter"
// check below: NS-11 defines it as the scope's unfiltered roster, so it
// would list this patient unconditionally regardless of whether NS-15 exists
// at all — checking it would not exercise the discovery-commitment gap this
// case is about. `REFERRAL_PENDING` is excluded too: the referral is closed,
// so a passing REFERRAL_PENDING result would say nothing about NS-15.

type TrackedReferral = Referral & Record<string, unknown>;

type EngineWithTracking = InMemoryCoordinationEngine & {
  recordTrackingOutcome?(
    referralId: string,
    input: { outcome: 'COMPLETED_PRIVATE_FACILITY' },
    context: RoleContext,
  ): Promise<TrackedReferral>;
};

type ArrivalRowWithStatus = ArrivalRow & { status?: 'PENDING' | 'OVERDUE' | 'RESOLVED' };

// NS-15's discovery commitment is a follow-up call; NS-11's remaining
// state-driven filters (excluding the roster and the now-closed referral)
// are exactly where such a commitment would plausibly surface.
const STATE_DRIVEN_FILTERS: WorklistFilter[] = [
  'ANC_DUE',
  'PMSMA_DUE',
  'TRACKING_NEEDED',
  'PRIVATE_CARE_DUE',
  'AT_RISK_OF_DROP_OUT',
  'LOST_TO_FOLLOW',
];

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };
const dhContext: RoleContext = { role: 'DH_SN', facilityId: 'FAC-DH-001' };

describe('TC-TRK-008 — private closure without a date creates a discovery commitment (EXPECTED FAIL)', () => {
  it('resolves the referral, leaves the DH worklist, and keeps the patient visible on at least one of the ANM state-driven filters', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithTracking;

    const patient = await engine.createPatient({
      name: 'Private No Date Patient',
      mobile: '+919800008001',
      gender: 'Female',
      age: 32,
      cid: 'Private No Date Patient',
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
      { outcome: 'COMPLETED_PRIVATE_FACILITY' },
      ashaContext,
    );
    expect(
      outcomeResult,
      'NS-7/NS-15: recording private completion with no follow-up date must be accepted — recordTrackingOutcome does not exist',
    ).toBeDefined();

    const resolved = await engine.getReferral(referral.id);
    expect(resolved?.status, 'NS-7: the referral must resolve').toBe('COMPLETED');

    const dhWorklist = (await engine.arrivalWorklist(dhContext)) as ArrivalRowWithStatus[];
    expect(
      dhWorklist.some((row) => row.id === referral.id),
      'NS-7: the referral must leave the DH arrival worklist once resolved',
    ).toBe(false);

    // The failure mode NS-15 exists to prevent is disappearance: with the
    // referral closed she is not pending, and with no tracking outcome of
    // "does not want to go" / "could not be contacted" she is not lost to
    // follow either — so without a discovery commitment she is in no
    // state-driven filter at all. Assert her actual presence in at least
    // one, not merely that her patient record still exists somewhere.
    const filterResults = await Promise.all(
      STATE_DRIVEN_FILTERS.map((filter) => engine.worklist(anmContext, filter)),
    );
    const appearsSomewhere = filterResults.some((rows) => rows.some((row) => row.id === patient.id));

    expect(
      appearsSomewhere,
      'NS-15: a discovery commitment must keep the patient on the ANM worklist — every state-driven filter answers empty today, so she is absent from all of them',
    ).toBe(true);
  });
});
