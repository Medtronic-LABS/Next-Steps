import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { CoordinationEngine, NewPatient } from '../src/engine';
import type { Id, Patient } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-1, NS-11 (batch 8a — TC-ROLE-001).
//
// No role, scope, or worklist-scoping mechanism exists anywhere in
// packages/core: `sections()` takes only a category filter and an
// unreachable threshold, with no notion of a role or a catchment. This
// test hypothesizes the documented shape — a `worklist(context, filter)`
// method scoped before any of the eight named filters — and calls it
// through optional chaining on a cast engine, so the call resolves to
// `undefined` and never throws. The assertions below are genuine runtime
// comparisons against the two catchments' actual patient ids, not import-
// or construction-time failures, and nothing here is a try/catch hiding a
// thrown error.

type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

type WorklistFilter =
  | 'ALL_REGISTERED'
  | 'REFERRAL_PENDING'
  | 'ANC_DUE'
  | 'PMSMA_DUE'
  | 'TRACKING_NEEDED'
  | 'PRIVATE_CARE_DUE'
  | 'AT_RISK_OF_DROP_OUT'
  | 'LOST_TO_FOLLOW';

const ALL_FILTERS: WorklistFilter[] = [
  'ALL_REGISTERED',
  'REFERRAL_PENDING',
  'ANC_DUE',
  'PMSMA_DUE',
  'TRACKING_NEEDED',
  'PRIVATE_CARE_DUE',
  'AT_RISK_OF_DROP_OUT',
  'LOST_TO_FOLLOW',
];

type NewPatientWithRegistration = NewPatient & { registeredAtFacilityId?: Id };

type EngineWithRoles = CoordinationEngine & {
  worklist?(context: RoleContext, filter: WorklistFilter): Promise<Patient[]>;
};

function newPatientInput(name: string, registeredAtFacilityId: Id): NewPatientWithRegistration {
  return {
    name,
    mobile: '+919800000000',
    gender: 'Female',
    age: 26,
    cid: name,
    consent: true,
    registeredAtFacilityId,
  };
}

describe('TC-ROLE-001 — scope is applied before any filter (EXPECTED FAIL)', () => {
  it('an ANM never sees another sub-centre\'s patients, under any of the eight filters', async () => {
    const engine = new InMemoryCoordinationEngine() as unknown as EngineWithRoles;

    const patientA = await engine.createPatient(newPatientInput('Sub-centre A Patient', 'SHC-A'));
    const patientB = await engine.createPatient(newPatientInput('Sub-centre B Patient', 'SHC-B'));

    const context: RoleContext = { role: 'ANM_CHO', scope: 'SHC-A' };

    const unfiltered = await engine.worklist?.(context, 'ALL_REGISTERED');
    expect(
      unfiltered?.map((p) => p.id),
      "NS-1: the unfiltered worklist for an ANM scoped to SHC-A must contain only SHC-A's patient, and must not contain SHC-B's",
    ).toEqual([patientA.id]);

    for (const filter of ALL_FILTERS) {
      const filtered = await engine.worklist?.(context, filter);
      const neverWidensBeyondScope = filtered?.every((p) => p.id !== patientB.id);
      expect(
        neverWidensBeyondScope,
        `NS-1, NS-11: filter ${filter} must never widen the ANM's result beyond SHC-A — scope is a precondition, not a filter`,
      ).toBe(true);
    }
  });
});
