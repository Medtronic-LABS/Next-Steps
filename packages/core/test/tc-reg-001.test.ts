import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { CoordinationEngine } from '../src/engine';

// ITEM-8-HRP-NEWBORN.md NS-17 (registration fields are profile-configured).
//
// `CoordinationEngine` exposes `categoryLabel`, `categoryDefaultDue`, `clinic`,
// and `rolesEnabled` as no-arg methods reading off whichever `ProgrammeProfile`
// the engine was constructed with (packages/core/src/engine.ts:222-231). No
// analogous `registrationFields()` exists — `age` and `gender` are required,
// unconditional properties of `NewPatient`/`Patient` (packages/core/src/
// engine.ts:32-51, types.ts:63-95), and `createPatient` copies them the same
// way regardless of which profile the engine holds
// (packages/core/src/inMemoryEngine.ts:683-710). This test hypothesizes
// `registrationFields()` as the missing accessor, named and shaped after the
// existing `rolesEnabled()` — a real method call reached through an optional
// chain on a cast, so it resolves to `undefined` rather than throwing, and
// the failure surfaces as a genuine runtime comparison below (same technique
// as TC-ROLE-003, TC-NB-002).

type RegistrationField = 'age' | 'gender' | 'villageName' | 'ashaName' | 'pregnancyStatus' | 'registeredAtFacilityId';

type EngineWithRegistrationFields = CoordinationEngine & {
  registrationFields?(): RegistrationField[];
};

describe('NS-17 (TC-REG-001) — registration fields are profile-configured (EXPECTED FAIL)', () => {
  it("excludes age and gender from the maternal profile's registration fields", () => {
    const maternalEngine = new InMemoryCoordinationEngine({
      profile: MATERNAL_PROFILE,
    }) as unknown as EngineWithRegistrationFields;

    const maternalFields = maternalEngine.registrationFields?.();

    expect(
      maternalFields?.includes('age'),
      'NS-17: the maternal profile collects no age at registration',
    ).toBe(false);
    expect(
      maternalFields?.includes('gender'),
      'NS-17: the maternal profile collects no gender at registration',
    ).toBe(false);
  });

  it("still includes age and gender in the diabetes profile's registration fields (regression guard on the existing demo)", () => {
    const diabetesEngine = new InMemoryCoordinationEngine() as unknown as EngineWithRegistrationFields;

    const diabetesFields = diabetesEngine.registrationFields?.();

    expect(
      diabetesFields?.includes('age'),
      'NS-17: the diabetes profile must keep collecting age — this is a regression guard, not a new requirement',
    ).toBe(true);
    expect(
      diabetesFields?.includes('gender'),
      'NS-17: the diabetes profile must keep collecting gender — this is a regression guard, not a new requirement',
    ).toBe(true);
  });
});
