import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { NewPatient } from '../src/engine';
import type { Patient } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-3 (batch 8e — TC-NB-001).
//
// Neither `childRchId` nor `motherRchId` exists on `Patient` or `NewPatient`
// today — registration has no newborn-identity link at all. This test
// hypothesizes both fields, named after NS-3's own language ("the child RCH
// ID, linked to the mother's RCH ID"), as an extension of the real, shipped
// `Patient`/`NewPatient` types, then drives only real engine methods —
// `createPatient`, `searchPatients`, `getPatient`, `allPatients`.
// `createPatient` copies a fixed set of named fields onto the stored record
// (see inMemoryEngine.ts); the two hypothesized fields are simply dropped by
// that copy, so every read below comes back `undefined` rather than
// throwing — a clean mismatch, never a thrown error.

const RCH_ID_SYSTEM = 'RCH_ID';
const MOTHER_RCH_ID = 'RCH-MOTHER-9001';
const CHILD_RCH_ID = 'RCH-CHILD-9001';

interface NewbornLink {
  childRchId?: string;
  motherRchId?: string;
}

type NewbornPatient = Patient & NewbornLink;
type NewNewbornPatient = NewPatient & NewbornLink;

async function registerMother(engine: InMemoryCoordinationEngine) {
  return engine.createPatient({
    name: 'Kavita Devi',
    mobile: '+919800007001',
    gender: 'Female',
    age: 26,
    cid: 'Kavita Devi',
    consent: true,
    identifiers: [{ system: RCH_ID_SYSTEM, value: MOTHER_RCH_ID }],
  });
}

async function registerNewborn(engine: InMemoryCoordinationEngine) {
  const input: NewNewbornPatient = {
    name: "Kavita Devi's baby",
    mobile: '+919800007001',
    gender: 'Male',
    age: 0,
    cid: "Kavita Devi's baby",
    consent: true,
    identifiers: [{ system: RCH_ID_SYSTEM, value: CHILD_RCH_ID }],
    childRchId: CHILD_RCH_ID,
    motherRchId: MOTHER_RCH_ID,
  };
  return engine.createPatient(input);
}

describe('TC-NB-001 — a newborn is found through the mother (EXPECTED FAIL)', () => {
  it("links the child RCH ID to the mother's, resolvable in both directions", async () => {
    const engine = new InMemoryCoordinationEngine();

    const mother = await registerMother(engine);
    const newborn = await registerNewborn(engine);

    const newbornRead = (await engine.getPatient(newborn.id)) as NewbornPatient | undefined;
    expect(
      newbornRead?.motherRchId,
      "NS-3: the newborn record must store the mother's RCH ID — no such link field exists on Patient today",
    ).toBe(MOTHER_RCH_ID);
    expect(
      newbornRead?.childRchId,
      'NS-3: the newborn record must store its own child RCH ID — no such field exists on Patient today',
    ).toBe(CHILD_RCH_ID);

    // Direction 1: a newborn found by searching the mother.
    const foundByMother = await engine.searchPatients('Kavita Devi');
    expect(
      foundByMother.some((p) => p.id === newborn.id),
      "NS-3: searching by the mother's name must surface her newborn — searchPatients only matches a patient's own name/mobile, with no maternal link to follow",
    ).toBe(true);

    // Direction 2: the mother reachable from the newborn, via the stored RCH ID link.
    const allPatients = await engine.allPatients();
    const motherFromNewborn = allPatients.find((p) =>
      p.identifier.some((i) => i.system === RCH_ID_SYSTEM && i.value === newbornRead?.motherRchId),
    );
    expect(
      motherFromNewborn?.id,
      'NS-3: the mother must be reachable from the newborn via the stored RCH ID link — the link is never persisted, so this resolves to no one',
    ).toBe(mother.id);
  });
});
