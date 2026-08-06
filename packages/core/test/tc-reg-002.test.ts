import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import * as core from '../src/index';
import type { NewPatient } from '../src/engine';
import type { Patient } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-17 (village is a configured list; the linked ASHA
// resolves from it, never from typed text).
//
// `facilities.ts` already proves this shape for referral destinations: a
// `FACILITIES` array plus a predicate, both re-exported from `index.ts`
// (packages/core/src/facilities.ts:14-28, index.ts:6). No equivalent exists
// for villages — `maternalSeed.ts` hardcodes a single village, `'Rampur'`
// (packages/core/src/maternalSeed.ts:36-37), and `ashaName` is a plain,
// unvalidated `string` on both `Patient` and `NewPatient`
// (types.ts:86, engine.ts:41), copied verbatim by `createPatient`
// (inMemoryEngine.ts:699) with no lookup against anything. This test
// hypothesizes a `VILLAGES` list re-exported the same way `FACILITIES` is,
// reached through a cast on the whole `index.ts` module so an absent export
// resolves to `undefined` rather than a collection-time import error (same
// technique as TC-ROLE-003). The registration assertions then exercise the
// real, already-shipped `createPatient`/`getPatient` to show today's actual
// (wrong) behaviour: a supplied `ashaName` is persisted exactly as typed.

interface VillageConfig {
  name: string;
  ashaName: string;
}

type CoreModule = { VILLAGES?: VillageConfig[] };

const NS17_VILLAGE_NAMES = ['Rampur Khurd', 'Bhagwanpur', 'Kishanganj', 'Chandpur', 'Nayagaon'];

function baseInput(overrides: Partial<NewPatient> & { ashaName?: string }): NewPatient {
  return {
    name: 'Village Registration Patient',
    mobile: '+919800000020',
    gender: 'Female',
    age: 26,
    cid: 'Village Registration Patient',
    consent: true,
    ...overrides,
  };
}

describe('NS-17 (TC-REG-002) — village resolves the linked ASHA from configuration (EXPECTED FAIL)', () => {
  it('exposes exactly the five NS-17 demo villages, each with a linked ASHA', () => {
    const villages = (core as unknown as CoreModule).VILLAGES;

    expect(villages?.length, 'NS-17: exactly five configured villages must exist').toBe(5);
    expect(
      villages?.map((v) => v.name),
      'NS-17: the demo seed must configure Rampur Khurd, Bhagwanpur, Kishanganj, Chandpur, and Nayagaon',
    ).toEqual(expect.arrayContaining(NS17_VILLAGE_NAMES));
    expect(
      villages?.every((v) => typeof v.ashaName === 'string' && v.ashaName.length > 0),
      'NS-17: every configured village must carry a linked ASHA',
    ).toBe(true);
  });

  it('resolves ashaName from the selected village, not from a typed value', async () => {
    const engine = new InMemoryCoordinationEngine();
    const villages = (core as unknown as CoreModule).VILLAGES;
    const target = villages?.[0];

    const input = baseInput({ villageName: target?.name ?? 'Rampur Khurd' });
    const created = await engine.createPatient(input);
    const read = (await engine.getPatient(created.id)) as Patient | undefined;

    expect(
      read?.ashaName,
      'NS-17: selecting a configured village must resolve its linked ASHA onto the record',
    ).toBe(target?.ashaName ?? 'expected-village-linked-asha');
  });

  it('never accepts a typed ashaName, even when one is supplied', async () => {
    const engine = new InMemoryCoordinationEngine();
    const villages = (core as unknown as CoreModule).VILLAGES;
    const target = villages?.[0];

    const input = baseInput({
      villageName: target?.name ?? 'Rampur Khurd',
      ashaName: 'Totally Made Up Asha Name',
    });
    const created = await engine.createPatient(input);
    const read = (await engine.getPatient(created.id)) as Patient | undefined;

    expect(
      read?.ashaName,
      'NS-17: ashaName is never accepted as free text — a typed value must not be persisted verbatim, it must resolve from village configuration instead',
    ).not.toBe('Totally Made Up Asha Name');
  });
});
