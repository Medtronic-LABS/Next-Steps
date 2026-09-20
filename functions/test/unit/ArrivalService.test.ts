import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { closeStep } from '../../src/domain/ClosureService.js';
import { getExpectedArrivals, recordArrival } from '../../src/domain/ArrivalService.js';
import { DomainError } from '../../src/domain/types.js';

describe('ArrivalService', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('lists an open referral as an expected arrival at the destination facility', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const expected = await getExpectedArrivals(CHC_TEONTHAR.id);
    expect(expected.map((s) => s.id)).toEqual([step.id]);
  });

  it('records arrival without closing the step (spec §2A: arrived != completed)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const arrived = await recordArrival({ actorUserId: PRIYA.id, stepId: step.id });
    expect(arrived.status).toBe('OPEN');
    expect(arrived.arrivedByUserId).toBe(PRIYA.id);
    expect(arrived.arrivedAt).not.toBeNull();

    const expected = await getExpectedArrivals(CHC_TEONTHAR.id);
    expect(expected).toEqual([]);
  });

  it('rejects arrival recorded by staff outside the destination facility', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    await expect(recordArrival({ actorUserId: ANITA.id, stepId: step.id })).rejects.toThrow(DomainError);
  });

  it('rejects recording arrival twice (spec §18)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    await recordArrival({ actorUserId: PRIYA.id, stepId: step.id });

    await expect(recordArrival({ actorUserId: PRIYA.id, stepId: step.id })).rejects.toThrow(DomainError);
  });

  it('allows on-site closure after arrival (Phase 4: arrival and completion stay independent)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    await recordArrival({ actorUserId: PRIYA.id, stepId: step.id });

    const closed = await closeStep({ actorUserId: PRIYA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' });
    expect(closed.status).toBe('DONE');
    expect(closed.arrivedByUserId).toBe(PRIYA.id);
  });
});
