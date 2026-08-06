import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { NewPatient } from '../src/engine';
import type { ProgrammeProfile } from '../src/profile';
import type { Patient, Referral, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-3 (batch 8e — TC-NB-002).
//
// `deliveryDate` exists nowhere on `Patient`/`NewPatient` — there is no
// event-date anchor for the newborn journey at all yet. This test
// hypothesizes the field, named after NS-3's own language ("`deliveryDate`
// is an event date, not a clinical measurement"), as an extension of the
// real, shipped `Patient`/`NewPatient` types. `createPatient` copies a fixed
// set of named fields onto the stored record (see inMemoryEngine.ts), so the
// hypothesized field is simply dropped — the read below comes back
// `undefined` rather than throwing, a clean mismatch, never a thrown error.
// The follow-up commitment itself is captured with the real, already-shipped
// `recordVisit`, whose `dueDate` override needs no hypothesis at all.

const DAY_MS = 24 * 60 * 60 * 1000;

interface DeliveryAnchor {
  deliveryDate?: Date;
}

type NewbornPatient = Patient & DeliveryAnchor;
type NewNewbornPatient = NewPatient & DeliveryAnchor;

// A deliberate, additional attempt to smuggle clinical fields in alongside
// `deliveryDate` — NS-3's own argument is that anything stored alongside it
// that *is* a measurement collapses the reason delivery date is acceptable
// where LMP is not. `createPatient` must not persist any of these.
type NewbornPatientWithClinicalAttempt = NewNewbornPatient & {
  birthWeightGrams?: number;
  gestationalAgeAtBirthWeeks?: number;
  condition?: string;
};

// "Today" is pinned with vi.setSystemTime — see TC-VISIT-004 — so BR-003's
// 30-day backdating limit is checked against a fixed clock rather than the
// real wall-clock date, which would otherwise carry dischargeDate further
// into the past every day until recordVisit started rejecting it.
const NB002_TODAY = new Date('2026-07-20T00:00:00Z');

describe('TC-NB-002 — delivery date anchors follow-up (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NB002_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores delivery date as an event date, with no clinical field alongside it, anchoring a 7-day follow-up', async () => {
    const engine = new InMemoryCoordinationEngine();

    const dischargeDate = new Date(NB002_TODAY.getTime() - 3 * DAY_MS);
    const deliveryDate = new Date(dischargeDate.getTime() - 3 * DAY_MS);
    const followUpDue = new Date(dischargeDate.getTime() + 7 * DAY_MS);

    const input: NewbornPatientWithClinicalAttempt = {
      name: 'SNCU Discharge Baby',
      mobile: '+919800007002',
      gender: 'Female',
      age: 0,
      cid: 'SNCU Discharge Baby',
      consent: true,
      deliveryDate,
      birthWeightGrams: 2200,
      gestationalAgeAtBirthWeeks: 34,
      condition: 'low birth weight',
    };
    const newborn = await engine.createPatient(input);

    const newbornRead = (await engine.getPatient(newborn.id)) as NewbornPatient | undefined;
    expect(
      newbornRead?.deliveryDate?.getTime(),
      'NS-3: delivery date must be stored as an event date anchoring follow-up — no such field exists on Patient today',
    ).toBe(deliveryDate.getTime());

    const newbornReadAsRecord = newbornRead as unknown as Record<string, unknown>;
    expect(
      'birthWeightGrams' in newbornReadAsRecord,
      'NS-3/BR-017: no birth weight may be stored anywhere on the newborn record — it would collapse the reason delivery date is acceptable where LMP is not',
    ).toBe(false);
    expect(
      'gestationalAgeAtBirthWeeks' in newbornReadAsRecord,
      'NS-3/BR-017: no gestational age at birth may be stored anywhere on the newborn record',
    ).toBe(false);
    expect(
      'condition' in newbornReadAsRecord,
      'NS-3/BR-017: no condition/diagnosis field may be stored anywhere on the newborn record',
    ).toBe(false);

    await engine.recordVisit(
      newborn.id,
      [{ cat: 'FOLLOW_UP_VISIT', dueKey: '1w', priority: 'NORMAL', dueDate: followUpDue }],
      { visitDateTime: dischargeDate },
    );
    const openSteps = await engine.openStepsForPatient(newborn.id);
    const followUp = openSteps.find((s) => s.cat === 'FOLLOW_UP_VISIT');
    expect(
      followUp?.dueDate.getTime(),
      'NS-3: the follow-up commitment must fall due 7 days from discharge',
    ).toBe(followUpDue.getTime());
  });
});

// ITEM-8-HRP-NEWBORN.md NS-8 (batch 8e). Unlike the two tests above, this one
// is not expected to fail: NS-8's escalation clock is already implemented as
// a single, profile-driven mechanism (see inMemoryEngine.ts's
// `materializeEscalation`, batch 8c), reading `escalationWindowDays` off
// whichever `ProgrammeProfile` the engine was constructed with — HRP and the
// newborn journey are two configurations of that one clock, not two branches
// of code. This assertion demonstrates NS-8 already holds for the newborn
// variant, in contrast to the identity-link and delivery-date gaps above.
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type EscalationProfile = ProgrammeProfile & { escalationWindowDays?: number };
type TrackedReferral = Referral & { escalationCount?: number };
type EngineWithTracking = InMemoryCoordinationEngine & {
  getReferral(referralId: string): Promise<TrackedReferral | undefined>;
};

const hrpProfile: EscalationProfile = { escalationWindowDays: 2 };
const newbornProfile: EscalationProfile = { escalationWindowDays: 1 };
const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

async function raiseIdenticalReferral(engine: InMemoryCoordinationEngine) {
  const patient = await engine.createPatient({
    name: 'Newborn Clock Patient',
    mobile: '+919800007003',
    gender: 'Male',
    age: 0,
    cid: 'Newborn Clock Patient',
    consent: true,
    ashaName: 'Asha One',
    registeredAtFacilityId: 'SHC-RAMPUR',
  });
  return engine.raiseReferral(
    patient.id,
    { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
    anmContext,
  );
}

describe("NS-8 (batch 8e) — the newborn profile's escalation clock is tighter than HRP's", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('escalates the newborn-profile referral after 1 day and the HRP-profile referral only after 2, with no branch on use case', async () => {
    const hrpEngine = new InMemoryCoordinationEngine({ profile: hrpProfile }) as EngineWithTracking;
    const newbornEngine = new InMemoryCoordinationEngine({ profile: newbornProfile }) as EngineWithTracking;

    const hrpReferral = await raiseIdenticalReferral(hrpEngine);
    const newbornReferral = await raiseIdenticalReferral(newbornEngine);

    vi.setSystemTime(new Date(RAISED_AT.getTime() + DAY_MS));
    const newbornDay1 = await newbornEngine.getReferral(newbornReferral.id);
    expect(
      newbornDay1?.escalationCount,
      'NS-8: the newborn profile (1-day window) must have escalated after 1 day',
    ).toBe(1);

    const hrpDay1 = await hrpEngine.getReferral(hrpReferral.id);
    expect(
      hrpDay1?.escalationCount ?? 0,
      'NS-8: the HRP profile (2-day window) must NOT have escalated after only 1 day',
    ).toBe(0);

    vi.setSystemTime(new Date(RAISED_AT.getTime() + 2 * DAY_MS));
    const hrpDay2 = await hrpEngine.getReferral(hrpReferral.id);
    expect(
      hrpDay2?.escalationCount,
      'NS-8: the HRP profile must have escalated by day 2 — the same clock code, only the profile value differs',
    ).toBe(1);
  });
});
