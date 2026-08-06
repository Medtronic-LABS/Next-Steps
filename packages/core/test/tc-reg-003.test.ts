import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import { MATERNAL_PROFILE } from '../src/maternalProfile';
import type { CoordinationEngine, NewPatient } from '../src/engine';
import type { Patient } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-17 / NS-12 (pregnancy status is a single-select
// routing label, maternal only, carrying no reason).
//
// No `pregnancyStatus` field, nor anything resembling one, exists anywhere on
// `Patient`/`NewPatient` today (types.ts:63-95, engine.ts:32-51) — `grep`
// across packages/core/src for `pregnancyStatus`/`hrpReason` returns nothing.
// `HRP` appears only as a routing-clock label in profile.ts's escalation
// window documentation, never as a stored patient attribute. This test
// hypothesizes `pregnancyStatus: 'NORMAL' | 'HIGH_RISK'` as the missing
// single-select field NS-12 describes, plus a deliberate attempt to smuggle
// two conflicting boolean checkboxes and a reason/threshold/danger-sign
// field alongside it — exactly the shape NS-12 forbids. `createPatient`
// copies only a fixed, named set of properties (inMemoryEngine.ts:683-710),
// so every hypothesized field is silently dropped and every read comes back
// `undefined` rather than throwing; the failures below are genuine runtime
// comparisons against NS-17's documented behaviour, not import-time errors.
// The `registrationFields()` hypothesis is shared with TC-REG-001.

type PregnancyStatus = 'NORMAL' | 'HIGH_RISK';

type MaternalPatient = Patient & { pregnancyStatus?: PregnancyStatus };

// The anti-pattern NS-17 rules out: two independent checkboxes instead of one
// single-select field, plus the reason/threshold/danger-sign detail NS-12
// forbids from ever accompanying a routing label.
type NewMaternalPatientAttempt = NewPatient & {
  pregnancyStatus?: PregnancyStatus;
  isNormalPregnancy?: boolean;
  isHighRiskPregnancy?: boolean;
  hrpReason?: string;
  riskThreshold?: string;
  dangerSign?: string;
};

type RegistrationField = 'age' | 'gender' | 'villageName' | 'ashaName' | 'pregnancyStatus' | 'registeredAtFacilityId';

type EngineWithRegistrationFields = CoordinationEngine & {
  registrationFields?(): RegistrationField[];
};

function baseInput(overrides: Partial<NewMaternalPatientAttempt>): NewMaternalPatientAttempt {
  return {
    name: 'Pregnancy Status Patient',
    mobile: '+919800000030',
    gender: 'Female',
    age: 28,
    cid: 'Pregnancy Status Patient',
    consent: true,
    ...overrides,
  };
}

describe('NS-17 (TC-REG-003) — pregnancy status is a single-select, maternal-only routing label (EXPECTED FAIL)', () => {
  it('persists pregnancyStatus as exactly one of NORMAL or HIGH_RISK, with no reason field anywhere on the record', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE });

    const created = await engine.createPatient(
      baseInput({
        pregnancyStatus: 'HIGH_RISK',
        hrpReason: 'reduced fetal movement',
        riskThreshold: 'BP >= 140/90',
        dangerSign: 'severe headache',
      }),
    );
    const read = (await engine.getPatient(created.id)) as MaternalPatient | undefined;

    expect(
      read?.pregnancyStatus,
      'NS-12/NS-17: pregnancyStatus must persist as the single-select value supplied at registration',
    ).toBe('HIGH_RISK');

    // Unreached until the field above exists (expect() throws on the first
    // failure), documented here as the rest of NS-12's requirement: no
    // reason, threshold, or danger-sign detail may accompany the label.
    const readAsRecord = read as unknown as Record<string, unknown>;
    expect(
      'hrpReason' in readAsRecord,
      'NS-12: no reason field may accompany pregnancyStatus anywhere on the record',
    ).toBe(false);
    expect(
      'riskThreshold' in readAsRecord,
      'NS-12: no threshold field may accompany pregnancyStatus anywhere on the record',
    ).toBe(false);
    expect(
      'dangerSign' in readAsRecord,
      'NS-12: no danger-sign field may accompany pregnancyStatus anywhere on the record',
    ).toBe(false);
  });

  it('cannot hold both normal and high-risk at once — one single-select field, not two checkboxes', async () => {
    const engine = new InMemoryCoordinationEngine({ profile: MATERNAL_PROFILE });

    const normalCreated = await engine.createPatient(
      baseInput({ pregnancyStatus: 'NORMAL', isNormalPregnancy: true, isHighRiskPregnancy: false }),
    );
    const highRiskCreated = await engine.createPatient(
      baseInput({ pregnancyStatus: 'HIGH_RISK', isNormalPregnancy: false, isHighRiskPregnancy: true }),
    );

    const normalRead = (await engine.getPatient(normalCreated.id)) as MaternalPatient | undefined;
    const highRiskRead = (await engine.getPatient(highRiskCreated.id)) as MaternalPatient | undefined;

    expect(
      normalRead?.pregnancyStatus,
      'NS-12/NS-17: a NORMAL registration must read back as NORMAL',
    ).toBe('NORMAL');
    expect(
      highRiskRead?.pregnancyStatus,
      'NS-12/NS-17: a HIGH_RISK registration must read back as HIGH_RISK',
    ).toBe('HIGH_RISK');
    expect(
      normalRead?.pregnancyStatus,
      'NS-12/NS-17: the two values are mutually exclusive and must never collapse to the same reading',
    ).not.toBe(highRiskRead?.pregnancyStatus);
  });

  it('is available only under the maternal profile, never the diabetes profile', () => {
    const maternalEngine = new InMemoryCoordinationEngine({
      profile: MATERNAL_PROFILE,
    }) as unknown as EngineWithRegistrationFields;
    const diabetesEngine = new InMemoryCoordinationEngine() as unknown as EngineWithRegistrationFields;

    const maternalFields = maternalEngine.registrationFields?.();
    const diabetesFields = diabetesEngine.registrationFields?.();

    expect(
      maternalFields?.includes('pregnancyStatus'),
      'NS-17: pregnancyStatus must be part of the maternal profile’s registration fields',
    ).toBe(true);
    expect(
      diabetesFields?.includes('pregnancyStatus') ?? false,
      'NS-17: pregnancyStatus must never appear in the diabetes profile’s registration fields',
    ).toBe(false);
  });
});
