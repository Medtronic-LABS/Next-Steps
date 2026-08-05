import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { CoordinationEngine, NewPatient } from '../src/engine';
import type { Id, Patient } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-1, NS-3 (batch 8a — TC-ROLE-002).
//
// `ashaName` is not part of `NewPatient` and `createPatient` never stores
// it (packages/core/src/inMemoryEngine.ts only copies name/mobile/gender/
// age/cid/consent onto the stored Patient). There is therefore no ASHA
// link to scope by, and no `worklist` method to scope with. This test
// hypothesizes both — the documented `ashaName` registration field and a
// `worklist(context, filter)` method scoped by that link — and calls the
// latter through optional chaining on a cast engine, so it resolves to
// `undefined` and never throws. The assertions are genuine runtime
// comparisons against the patients actually created, not import- or
// construction-time failures.

type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

type NewPatientWithLink = NewPatient & { ashaName?: string; registeredAtFacilityId?: Id };

type EngineWithRoles = CoordinationEngine & {
  worklist?(context: RoleContext, filter: 'ALL_REGISTERED'): Promise<Patient[]>;
};

function newPatientInput(name: string, ashaName: string): NewPatientWithLink {
  return {
    name,
    mobile: '+919800000001',
    gender: 'Female',
    age: 24,
    cid: name,
    consent: true,
    ashaName,
    registeredAtFacilityId: 'SHC-RAMPUR',
  };
}

describe('TC-ROLE-002 — an ASHA sees only her linked patients (EXPECTED FAIL)', () => {
  it("each ASHA's worklist holds only her linked patients; the ANM's holds both", async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithRoles;

    const linkedToFirst = await engine.createPatient(newPatientInput('Linked To Asha One', 'Asha One'));
    const linkedToSecond = await engine.createPatient(newPatientInput('Linked To Asha Two', 'Asha Two'));

    const ashaOneContext: RoleContext = { role: 'ASHA', scope: 'Asha One' };
    const ashaTwoContext: RoleContext = { role: 'ASHA', scope: 'Asha Two' };
    const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

    const ashaOneWorklist = await engine.worklist?.(ashaOneContext, 'ALL_REGISTERED');
    expect(
      ashaOneWorklist?.map((p) => p.id),
      'NS-1: Asha One must see only the patient linked to her, not the patient linked to Asha Two',
    ).toEqual([linkedToFirst.id]);

    const ashaTwoWorklist = await engine.worklist?.(ashaTwoContext, 'ALL_REGISTERED');
    expect(
      ashaTwoWorklist?.map((p) => p.id),
      'NS-1: Asha Two must see only the patient linked to her, not the patient linked to Asha One',
    ).toEqual([linkedToSecond.id]);

    const anmWorklist = await engine.worklist?.(anmContext, 'ALL_REGISTERED');
    expect(
      anmWorklist?.map((p) => p.id).sort(),
      'NS-1: the ANM_CHO over the shared sub-centre must see both patients regardless of ASHA link',
    ).toEqual([linkedToFirst.id, linkedToSecond.id].sort());
  });
});
