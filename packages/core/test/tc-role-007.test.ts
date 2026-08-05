import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { CoordinationEngine } from '../src/engine';
import type { Id } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-4, NS-13 (batch 8a — TC-ROLE-007).
//
// No `raiseReferral`, no role-scoped worklist, and no arrival worklist
// exist anywhere in packages/core, so nothing today could partition the
// store by role in the first place — but nothing proves it doesn't,
// either. This test hypothesizes NS-4/NS-13's documented shape on a
// single shared engine instance (one store, as NS-13 requires): an ANM
// raises a referral, the same engine instance is then read as the
// receiving facility's nurse, and back as the ANM. The calls go through
// optional chaining on a cast engine, so they resolve to `undefined` and
// never throw; the assertions are genuine runtime comparisons that the
// same referral id is visible from both viewpoints and that the ANM's
// view is unchanged after the switch back — not import- or
// construction-time failures, and nothing here is a try/catch hiding a
// thrown error.

type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

interface RaisedReferral {
  id: Id;
  expectedAtFacilityId: Id;
  direction: 'UPWARD' | 'DOWNWARD';
}

interface ArrivalRow {
  id: Id;
  patientId: Id;
}

interface PendingRow {
  id: Id;
  referralId?: Id;
}

type EngineWithRoles = CoordinationEngine & {
  raiseReferral?(
    patientId: Id,
    input: { expectedAtFacilityId: Id; direction: 'UPWARD' | 'DOWNWARD' },
    context: RoleContext,
  ): Promise<RaisedReferral>;
  worklist?(context: RoleContext, filter: 'REFERRAL_PENDING'): Promise<PendingRow[]>;
  arrivalWorklist?(context: RoleContext): Promise<ArrivalRow[]>;
};

describe('TC-ROLE-007 — switching role changes scope, never the data (EXPECTED FAIL)', () => {
  it('a referral raised by an ANM is the same record the receiving facility nurse sees, and survives switching role and back', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithRoles;

    const patient = await engine.createPatient({
      name: 'Cross-Role Patient',
      mobile: '+919800000006',
      gender: 'Female',
      age: 27,
      cid: 'Cross-Role Patient',
      consent: true,
    });

    const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
    const phcContext: RoleContext = { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' };

    const referral = await engine.raiseReferral?.(
      patient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );

    // Switch role: the receiving facility's nurse must see the very same
    // referral record, not a copy or a re-derived one.
    const phcArrivals = await engine.arrivalWorklist?.(phcContext);
    expect(
      phcArrivals?.some((row) => row.id === referral?.id),
      'NS-4, NS-13: the referral raised by the ANM must be the same record the PHC nurse sees on her arrival worklist',
    ).toBe(true);

    // Switch back to the ANM. If role selection reset or partitioned the
    // store rather than merely changing the viewing context, the referral
    // she raised would no longer be there.
    const anmPendingAfterSwitch = await engine.worklist?.(anmContext, 'REFERRAL_PENDING');
    expect(
      anmPendingAfterSwitch?.some((row) => row.id === referral?.id || row.referralId === referral?.id),
      'NS-13: switching role and back must not reset, clear, or partition the store — the ANM must still see the referral she raised',
    ).toBe(true);
  });
});
