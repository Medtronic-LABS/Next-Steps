import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-10 (batch 8d — TC-WL-002).
//
// No PMSMA scheduling mechanism exists anywhere in packages/core —
// `schedulePmsma` is a hypothesized method, reached only through optional
// chaining on a cast engine, so every call below resolves to `undefined`
// and never throws. The worklist's PMSMA_DUE filter is real but currently
// answers empty unconditionally (packages/core/src/inMemoryEngine.ts's
// `worklist` switch has no case for it), so reading a scheduled patient's
// `dueDate` back through it is a genuine empty-array / undefined mismatch,
// not a thrown error.
//
// The three scheduling calls are deliberately staggered a day apart so the
// case actually distinguishes NS-10's fixed calendar date from an offset:
// if PMSMA were (wrongly) implemented as "N days from the scheduling
// action", the three dates would differ. NS-10 requires they don't.

const DAY_MS = 24 * 60 * 60 * 1000;

// The current month's 9th has already passed — the next PMSMA session for
// the village is therefore next month's 9th, not this month's.
const SCHEDULING_DAY_ONE = new Date('2026-08-15T09:00:00Z');
const CONFIGURED_SESSION_DATE = new Date('2026-09-09T00:00:00Z');

type EngineWithPmsma = InMemoryCoordinationEngine & {
  schedulePmsma?(patientId: Id, context: RoleContext): Promise<{ sessionDate?: Date } | undefined>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

describe('TC-WL-002 — PMSMA attaches to a village session date (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(SCHEDULING_DAY_ONE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('three women in one village all land on the same fixed session date, regardless of which day each was scheduled', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithPmsma;

    const villageName = 'Rampur Village';

    const patientA = await engine.createPatient({
      name: 'PMSMA Village Patient A',
      mobile: '+919800012001',
      gender: 'Female',
      age: 25,
      cid: 'PMSMA Village Patient A',
      consent: true,
      villageName,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const resultA = await engine.schedulePmsma?.(patientA.id, anmContext);
    expect(
      resultA,
      'NS-10: scheduling a woman for PMSMA must be accepted — schedulePmsma does not exist',
    ).toBeDefined();

    vi.setSystemTime(new Date(SCHEDULING_DAY_ONE.getTime() + 1 * DAY_MS));
    const patientB = await engine.createPatient({
      name: 'PMSMA Village Patient B',
      mobile: '+919800012002',
      gender: 'Female',
      age: 33,
      cid: 'PMSMA Village Patient B',
      consent: true,
      villageName,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    await engine.schedulePmsma?.(patientB.id, anmContext);

    vi.setSystemTime(new Date(SCHEDULING_DAY_ONE.getTime() + 2 * DAY_MS));
    const patientC = await engine.createPatient({
      name: 'PMSMA Village Patient C',
      mobile: '+919800012003',
      gender: 'Female',
      age: 29,
      cid: 'PMSMA Village Patient C',
      consent: true,
      villageName,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    await engine.schedulePmsma?.(patientC.id, anmContext);

    const pmsmaRows = await engine.worklist(anmContext, 'PMSMA_DUE');
    const rowFor = (id: Id) => pmsmaRows.find((r) => r.id === id);

    expect(
      rowFor(patientA.id)?.dueDate,
      'NS-10: patient A must carry the configured session date — PMSMA_DUE always answers empty today',
    ).toEqual(CONFIGURED_SESSION_DATE);
    expect(
      rowFor(patientB.id)?.dueDate,
      'NS-10: patient B, scheduled a day later than A, must carry the same session date — not an offset from her own scheduling action',
    ).toEqual(CONFIGURED_SESSION_DATE);
    expect(
      rowFor(patientC.id)?.dueDate,
      'NS-10: patient C, scheduled two days later than A, must carry the same session date as A and B',
    ).toEqual(CONFIGURED_SESSION_DATE);
  });
});
