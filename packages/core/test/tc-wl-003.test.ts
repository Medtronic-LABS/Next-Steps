import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { WorklistFilter } from '../src/engine';
import type { RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-14 (batch 8d — TC-WL-003).
//
// No unread-badge mechanism exists anywhere in packages/core — this is an
// in-app-only concept (NS-14 is explicit that a push notification delivered
// while the app is closed is out of scope) and nothing tracks "new since
// last opened" state at all today. `unreadCounts` and `markFilterOpened`
// are hypothesized methods, reached only through optional chaining on a
// cast engine, so every call below resolves to `undefined` and never
// throws. The escalation setup that produces the "newly-escalated item" is
// real (NS-8, already shipped in batch 8c); only the badge layer on top of
// it is hypothesized.

type UnreadCounts = { total?: number; byFilter?: Partial<Record<WorklistFilter, number>> };

type EngineWithBadges = InMemoryCoordinationEngine & {
  unreadCounts?(context: RoleContext): Promise<UnreadCounts | undefined>;
  markFilterOpened?(context: RoleContext, filter: WorklistFilter): Promise<void>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');
const WINDOW_DAYS = 2;
const WINDOW_MS = WINDOW_DAYS * DAY_MS;

const dhContext: RoleContext = { role: 'DH_SN', facilityId: 'FAC-DH-001' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha WL-003' };
const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };

describe('TC-WL-003 — unread badges per filter (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('the entry point and each affected filter carry their own unread count, and opening one filter clears only that count', async () => {
    const engine = new InMemoryCoordinationEngine({
      profile: { escalationWindowDays: WINDOW_DAYS },
    }) as EngineWithBadges;

    // One patient linked to a specific ASHA, referred to the DH.
    const escalatedPatient = await engine.createPatient({
      name: 'Escalated Arrival Patient',
      mobile: '+919800013001',
      gender: 'Female',
      age: 30,
      cid: 'Escalated Arrival Patient',
      consent: true,
      ashaName: 'Asha WL-003',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const escalatedReferral = await engine.raiseReferral(
      escalatedPatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // Two escalation windows elapse with no reset — a real, already-shipped
    // escalation, materialized by this real read.
    vi.setSystemTime(new Date(RAISED_AT.getTime() + 2 * WINDOW_MS));
    const escalated = await engine.getReferral(escalatedReferral.id);
    expect(
      escalated?.escalationCount,
      'NS-8: setup precondition — two elapsed escalation windows must bring the count to 2',
    ).toBe(2);

    // A second, ordinary referral to the same DH, raised at this same
    // instant — newly arrived, but never escalated.
    const ordinaryPatient = await engine.createPatient({
      name: 'Ordinary Arrival Patient',
      mobile: '+919800013002',
      gender: 'Female',
      age: 27,
      cid: 'Ordinary Arrival Patient',
      consent: true,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    await engine.raiseReferral(
      ordinaryPatient.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // Given: the facility nurse has two newly-arrived referrals.
    const dhCountsBefore = await engine.unreadCounts?.(dhContext);
    expect(
      dhCountsBefore?.total,
      'NS-14: the worklist entry point must carry an unread count of 2 for the two newly-arrived referrals — unreadCounts does not exist',
    ).toBe(2);
    expect(
      dhCountsBefore?.byFilter?.REFERRAL_PENDING,
      'NS-14: REFERRAL_PENDING must carry its own unread count of 2',
    ).toBe(2);
    expect(
      dhCountsBefore?.byFilter?.AT_RISK_OF_DROP_OUT,
      'NS-14: AT_RISK_OF_DROP_OUT must carry its own unread count of 1, for the one newly-escalated referral expected at this facility',
    ).toBe(1);

    // Given: the linked ASHA has one newly-escalated item.
    const ashaCountsBefore = await engine.unreadCounts?.(ashaContext);
    expect(
      ashaCountsBefore?.byFilter?.AT_RISK_OF_DROP_OUT,
      'NS-14: the linked ASHA must independently see an unread count of 1 on AT_RISK_OF_DROP_OUT for her newly-escalated patient',
    ).toBe(1);

    // When: the nurse opens the REFERRAL_PENDING filter.
    await engine.markFilterOpened?.(dhContext, 'REFERRAL_PENDING');
    const dhCountsAfter = await engine.unreadCounts?.(dhContext);

    // Then: only that filter's count clears.
    expect(
      dhCountsAfter?.byFilter?.REFERRAL_PENDING,
      'NS-14: opening REFERRAL_PENDING must clear its own count to 0 — markFilterOpened does not exist',
    ).toBe(0);
    expect(
      dhCountsAfter?.byFilter?.AT_RISK_OF_DROP_OUT,
      'NS-14: opening REFERRAL_PENDING must not clear AT_RISK_OF_DROP_OUT — a single global count would, a per-filter one must not',
    ).toBe(1);

    // The ASHA never opened anything — her own count must be untouched by
    // the nurse's action on an entirely different role's worklist.
    const ashaCountsAfter = await engine.unreadCounts?.(ashaContext);
    expect(
      ashaCountsAfter?.byFilter?.AT_RISK_OF_DROP_OUT,
      'NS-14: the ASHA\'s unread count must be unaffected by the nurse opening her own filter',
    ).toBe(1);
  });
});
