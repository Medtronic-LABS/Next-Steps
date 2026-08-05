import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { ArrivalRow } from '../src/engine';
import type { Id, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-4 (batch 8b — TC-REF-002).
//
// `arrivalWorklist` already exists (batch 8a) and does return a row for a
// referral expected at the queried facility — that part is real and
// asserted for real below. What it returns is only
// `{ id, patientId, expectedAtFacilityId, direction }`
// (packages/core/src/engine.ts `ArrivalRow`); there is no `status` field,
// so it cannot distinguish "pending" from "overdue", and there is no way to
// resolve a referral at all (no `closeReferral` or equivalent anywhere in
// packages/core), so "remains until resolved" cannot be demonstrated as
// anything but "remains forever". This test pins the clock with vitest's
// fake timers (the house convention, e.g. tc-over-003.test.ts), advances it
// exactly as TC-REF-002 describes, and reads the real `arrivalWorklist`
// result at each point. The status comparisons are genuine runtime
// mismatches against an object vitest actually returned — `row.status` is
// `undefined`, not a thrown error — and the "resolved" hypothesis reaches
// a `closeReferral` that does not exist via optional chaining on a cast, so
// it resolves to `undefined` and never throws.

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');

type ArrivalRowWithStatus = ArrivalRow & { status?: 'PENDING' | 'OVERDUE' | 'RESOLVED' };

type EngineWithClosure = InMemoryCoordinationEngine & {
  closeReferral?(referralId: Id, context: RoleContext): Promise<unknown>;
};

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const phcContext: RoleContext = { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' };

describe('TC-REF-002 — the referral appears on the destination arrival worklist (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is pending the day after it is raised, overdue on day 3, and remains present until resolved', async () => {
    const engine = new InMemoryCoordinationEngine() as EngineWithClosure;
    const patient = await engine.createPatient({
      name: 'Arrival Worklist Patient',
      mobile: '+919800002001',
      gender: 'Female',
      age: 24,
      cid: 'Arrival Worklist Patient',
      consent: true,
    });

    const referral = await engine.raiseReferral(
      patient.id,
      { expectedAtFacilityId: 'FAC-PHC-RAMPUR', direction: 'UPWARD' },
      anmContext,
    );

    // Tomorrow: present, status pending.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + DAY_MS));
    const tomorrow = (await engine.arrivalWorklist(phcContext)) as ArrivalRowWithStatus[];
    const tomorrowRow = tomorrow.find((row) => row.id === referral.id);

    expect(
      tomorrowRow,
      'NS-4: the referral must be present on the destination arrival worklist the day after it is raised',
    ).toBeDefined();
    expect(
      tomorrowRow?.status,
      'NS-4: the row must report a pending status the day after it is raised — ArrivalRow has no status field',
    ).toBe('PENDING');

    // Day 3: present, status overdue.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + 3 * DAY_MS));
    const day3 = (await engine.arrivalWorklist(phcContext)) as ArrivalRowWithStatus[];
    const day3Row = day3.find((row) => row.id === referral.id);

    expect(day3Row, 'NS-4: the referral must still be present on day 3').toBeDefined();
    expect(
      day3Row?.status,
      'NS-4: by day 3 the row must report overdue status — ArrivalRow has no status field',
    ).toBe('OVERDUE');

    // Resolved: must no longer be present. No resolution mechanism exists,
    // so this reaches a hypothesized closeReferral through optional
    // chaining — it resolves to undefined and never throws.
    await engine.closeReferral?.(referral.id, phcContext);
    const afterClose = await engine.arrivalWorklist(phcContext);

    expect(
      afterClose.some((row) => row.id === referral.id),
      'NS-4: once resolved, the referral must leave the arrival worklist — no closure mechanism exists to resolve it',
    ).toBe(false);
  });
});
