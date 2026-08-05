import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { WorklistFilter } from '../src/engine';
import type { Id, RoleContext } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-11 (batch 8d — TC-WL-001).
//
// `worklist()` is the real, already-shipped method and all eight
// `WorklistFilter` values are real. Six of the eight filters
// (ALL_REGISTERED, REFERRAL_PENDING, PRIVATE_CARE_DUE, TRACKING_NEEDED,
// AT_RISK_OF_DROP_OUT, LOST_TO_FOLLOW) were wired up in batch 8c and are
// expected to answer correctly below. The other two — ANC_DUE and
// PMSMA_DUE — have no case in the `worklist` switch
// (packages/core/src/inMemoryEngine.ts: "ANC_DUE, PMSMA_DUE depend on the
// ANC scheduling and PMSMA state introduced in batch 8d ... until then
// they truthfully answer 'none yet'") and no scheduling mechanism exists
// to populate them regardless. `scheduleAncVisit` and `schedulePmsma` are
// hypothesized methods, reached only through optional chaining on a cast
// engine, so those two calls resolve to `undefined` and never throw. The
// two filters they should have populated are then read through the real
// `worklist()` method and compared against the patient each was meant to
// surface — genuine empty-array mismatches, not thrown errors.

type EngineWithScheduling = InMemoryCoordinationEngine & {
  scheduleAncVisit?(patientId: Id, dueDate: Date, context: RoleContext): Promise<unknown>;
  schedulePmsma?(patientId: Id, context: RoleContext): Promise<unknown>;
};

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

const DAY_MS = 24 * 60 * 60 * 1000;
const RAISED_AT = new Date('2026-08-05T09:00:00Z');
const WINDOW_DAYS = 2;
const WINDOW_MS = WINDOW_DAYS * DAY_MS;

const anmContext: RoleContext = { role: 'ANM_CHO', scope: 'SHC-RAMPUR' };
const ashaContext: RoleContext = { role: 'ASHA', scope: 'Asha WL-001' };

function sortedIds(rows: { id: Id }[]): Id[] {
  return rows.map((r) => r.id).sort();
}

describe('TC-WL-001 — eight filters over one scoped worklist (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(RAISED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('each of the eight named filters returns exactly the patients matching its definition, and every result stays inside ALL_REGISTERED — overlap between filters is permitted, not partitioned', async () => {
    const engine = new InMemoryCoordinationEngine({
      profile: { escalationWindowDays: WINDOW_DAYS },
    }) as EngineWithScheduling;

    // A patient whose referral is escalated twice and then reported
    // unreachable — legitimately both AT_RISK_OF_DROP_OUT and
    // LOST_TO_FOLLOW at once (NS-9), and still REFERRAL_PENDING since
    // neither state resolves the referral.
    const dropoutAndLost = await engine.createPatient({
      name: 'Dropout And Lost Patient',
      mobile: '+919800011001',
      gender: 'Female',
      age: 28,
      cid: 'Dropout And Lost Patient',
      consent: true,
      ashaName: 'Asha WL-001',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const dropoutReferral = await engine.raiseReferral(
      dropoutAndLost.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    // Two escalation windows elapse with no reset — escalationCount reaches
    // 2 (NS-9's AT_RISK_OF_DROP_OUT threshold) before the outcome below is
    // recorded, since recordTrackingOutcome catches escalation up to `now`
    // before applying the outcome (NS-8).
    vi.setSystemTime(new Date(RAISED_AT.getTime() + 2 * WINDOW_MS));
    await engine.recordTrackingOutcome(
      dropoutReferral.id,
      { outcome: 'COULD_NOT_BE_CONTACTED' },
      ashaContext,
    );

    // Everything else is raised/created at this same, now-frozen instant, so
    // none of it picks up any escalation of its own.
    const baseline = await engine.createPatient({
      name: 'Baseline Registered Patient',
      mobile: '+919800011002',
      gender: 'Female',
      age: 24,
      cid: 'Baseline Registered Patient',
      consent: true,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });

    const referralPending = await engine.createPatient({
      name: 'Referral Pending Patient',
      mobile: '+919800011003',
      gender: 'Female',
      age: 30,
      cid: 'Referral Pending Patient',
      consent: true,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    await engine.raiseReferral(
      referralPending.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );

    const privateCareDue = await engine.createPatient({
      name: 'Private Care Due Patient',
      mobile: '+919800011004',
      gender: 'Female',
      age: 27,
      cid: 'Private Care Due Patient',
      consent: true,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const privateReferral = await engine.raiseReferral(
      privateCareDue.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );
    await engine.recordTrackingOutcome(
      privateReferral.id,
      { outcome: 'COMPLETED_PRIVATE_FACILITY', privateFollowUpDate: new Date('2026-09-01T00:00:00Z') },
      ashaContext,
    );

    // NS-15: the same leaf with no date creates a discovery commitment
    // instead — the one deliberate overlap the current implementation
    // already produces, since PRIVATE_CARE_DUE reads discovery commitments
    // as well as ordinary ones (NS-15's "she is not absent from every
    // filter").
    const trackingNeeded = await engine.createPatient({
      name: 'Tracking Needed Patient',
      mobile: '+919800011005',
      gender: 'Female',
      age: 31,
      cid: 'Tracking Needed Patient',
      consent: true,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    const discoveryReferral = await engine.raiseReferral(
      trackingNeeded.id,
      { expectedAtFacilityId: 'FAC-DH-001', direction: 'UPWARD' },
      anmContext,
    );
    await engine.recordTrackingOutcome(
      discoveryReferral.id,
      { outcome: 'COMPLETED_PRIVATE_FACILITY' },
      ashaContext,
    );

    const ancDue = await engine.createPatient({
      name: 'ANC Due Patient',
      mobile: '+919800011006',
      gender: 'Female',
      age: 26,
      cid: 'ANC Due Patient',
      consent: true,
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    await engine.scheduleAncVisit?.(ancDue.id, new Date('2026-08-20T00:00:00Z'), anmContext);

    const pmsmaDue = await engine.createPatient({
      name: 'PMSMA Due Patient',
      mobile: '+919800011007',
      gender: 'Female',
      age: 29,
      cid: 'PMSMA Due Patient',
      consent: true,
      villageName: 'Rampur Village',
      registeredAtFacilityId: 'SHC-RAMPUR',
    });
    await engine.schedulePmsma?.(pmsmaDue.id, anmContext);

    const allRegistered = await engine.worklist(anmContext, 'ALL_REGISTERED');
    const allRegisteredIds = sortedIds(allRegistered);
    expect(
      allRegisteredIds,
      'NS-11: ALL_REGISTERED is the unfiltered scope — every seeded patient must appear',
    ).toEqual(
      [dropoutAndLost, baseline, referralPending, privateCareDue, trackingNeeded, ancDue, pmsmaDue]
        .map((p) => p.id)
        .sort(),
    );

    const expectedByFilter: Record<WorklistFilter, Id[]> = {
      ALL_REGISTERED: allRegisteredIds,
      REFERRAL_PENDING: [dropoutAndLost.id, referralPending.id].sort(),
      ANC_DUE: [ancDue.id].sort(),
      PMSMA_DUE: [pmsmaDue.id].sort(),
      TRACKING_NEEDED: [trackingNeeded.id].sort(),
      PRIVATE_CARE_DUE: [privateCareDue.id, trackingNeeded.id].sort(),
      AT_RISK_OF_DROP_OUT: [dropoutAndLost.id].sort(),
      LOST_TO_FOLLOW: [dropoutAndLost.id].sort(),
    };

    for (const filter of ALL_FILTERS) {
      const rows = await engine.worklist(anmContext, filter);
      const ids = sortedIds(rows);

      expect(
        ids,
        `NS-11: ${filter} must return exactly the patients matching its definition`,
      ).toEqual(expectedByFilter[filter]);

      expect(
        ids.every((id) => allRegisteredIds.includes(id)),
        `NS-11: ${filter}'s result must be a subset of ALL_REGISTERED — it never widens scope`,
      ).toBe(true);
    }

    // Filters may overlap (NS-11) — assert the overlap exists, not that the
    // eight filters partition ALL_REGISTERED into disjoint buckets.
    const atRisk = await engine.worklist(anmContext, 'AT_RISK_OF_DROP_OUT');
    const lost = await engine.worklist(anmContext, 'LOST_TO_FOLLOW');
    const pending = await engine.worklist(anmContext, 'REFERRAL_PENDING');
    expect(
      atRisk.some((r) => r.id === dropoutAndLost.id) &&
        lost.some((r) => r.id === dropoutAndLost.id) &&
        pending.some((r) => r.id === dropoutAndLost.id),
      'NS-11: a patient escalated twice and then unreachable is legitimately in all three of REFERRAL_PENDING, AT_RISK_OF_DROP_OUT and LOST_TO_FOLLOW at once',
    ).toBe(true);

    const trackingNeededRows = await engine.worklist(anmContext, 'TRACKING_NEEDED');
    const privateCareDueRows = await engine.worklist(anmContext, 'PRIVATE_CARE_DUE');
    expect(
      trackingNeededRows.some((r) => r.id === trackingNeeded.id) &&
        privateCareDueRows.some((r) => r.id === trackingNeeded.id),
      'NS-11, NS-15: a discovery commitment legitimately appears in both TRACKING_NEEDED and PRIVATE_CARE_DUE at once',
    ).toBe(true);
  });
});
