import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-7 (batch 8c — TC-TRK-001).
//
// No tracking-outcome taxonomy exists anywhere in packages/core: `types.ts`
// has no TrackingOutcome type, and InMemoryCoordinationEngine has no
// `recordTrackingOutcome` (or equivalent) to record one. This test
// hypothesizes the six leaves NS-7 names — reusing NS-6's own
// CompletionLocation vocabulary for the three "completed" leaves, since they
// resolve to the same three locations — and calls the hypothesized method
// through optional chaining on a cast engine, so every call resolves to
// `undefined` and never throws. The count comparison below is a genuine
// runtime tally of what came back, not a thrown error.

type TrackingOutcome =
  | 'COMPLETED_REFERRED_PUBLIC_FACILITY'
  | 'COMPLETED_OTHER_PUBLIC_FACILITY'
  | 'COMPLETED_PRIVATE_FACILITY'
  | 'PLAN_TO_GO_LATER'
  | 'DOES_NOT_WANT_TO_GO'
  | 'COULD_NOT_BE_CONTACTED';

const ALL_OUTCOMES: TrackingOutcome[] = [
  'COMPLETED_REFERRED_PUBLIC_FACILITY',
  'COMPLETED_OTHER_PUBLIC_FACILITY',
  'COMPLETED_PRIVATE_FACILITY',
  'PLAN_TO_GO_LATER',
  'DOES_NOT_WANT_TO_GO',
  'COULD_NOT_BE_CONTACTED',
];

type TrackedReferral = Referral & Record<string, unknown>;

type EngineWithTracking = InMemoryCoordinationEngine & {
  recordTrackingOutcome?(
    referralId: Id,
    input: { outcome: TrackingOutcome },
    context: RoleContext,
  ): Promise<TrackedReferral>;
};

const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };

describe('TC-TRK-001 — exactly six tracking outcomes (EXPECTED FAIL)', () => {
  it('accepts all six NS-7 leaves and stores no clinical detail alongside any of them', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithTracking;

    const results: Array<TrackedReferral | undefined> = [];
    for (let i = 0; i < ALL_OUTCOMES.length; i += 1) {
      const outcome = ALL_OUTCOMES[i];
      const patient = await engine.createPatient({
        name: `Tracking Outcome Patient ${i}`,
        mobile: `+9198000010${String(i).padStart(2, '0')}`,
        gender: 'Female',
        age: 26,
        cid: `Tracking Outcome Patient ${i}`,
        consent: true,
        ashaName: 'Asha One',
        registeredAtFacilityId: 'SHC-RAMPUR',
      });
      const referral = await engine.raiseReferral(
        patient.id,
        { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
        ashaContext,
      );
      const result = await engine.recordTrackingOutcome?.(referral.id, { outcome }, ashaContext);
      results.push(result);
    }

    expect(
      results.filter(Boolean).length,
      'NS-7: all six leaves of the tracking-outcome taxonomy must be recordable — recordTrackingOutcome does not exist',
    ).toBe(6);

    for (const result of results) {
      const hasClinicalField = Boolean(
        result && ('reason' in result || 'dangerSign' in result || 'clinicalNote' in result),
      );
      expect(
        hasClinicalField,
        'NS-7/BR-017: a tracking outcome must never carry a free-text clinical reason or danger-sign detail',
      ).toBe(false);
    }
  });
});
