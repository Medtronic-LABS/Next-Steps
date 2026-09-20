import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep, stageStep } from '../../src/domain/ReferralService.js';
import { DomainError } from '../../src/domain/types.js';

describe('ReferralService', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('stages a defaulted referral to the seeded CHC without writing to Firestore', async () => {
    const staged = await stageStep({ actorUserId: ANITA.id, patientId: LAKSHMI_DEVI.id });
    expect(staged.destinationFacilityId).toBe(CHC_TEONTHAR.id);
    expect(staged.patientId).toBe(LAKSHMI_DEVI.id);
  });

  it('confirms a referral as an OPEN step owned by the ANM (spec RBAC)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    expect(step.status).toBe('OPEN');
    expect(step.ownerUserId).toBe(ANITA.id);
    expect(step.originFacilityId).toBe(ANITA.facilityId);
  });

  it('rejects staging a referral by a non-ANM (spec §19 RBAC — Priya permissions)', async () => {
    await expect(stageStep({ actorUserId: PRIYA.id, patientId: LAKSHMI_DEVI.id })).rejects.toThrow(DomainError);
  });

  it('rejects confirming a referral by a non-ANM', async () => {
    await expect(
      confirmStep({
        actorUserId: PRIYA.id,
        patientId: LAKSHMI_DEVI.id,
        destinationFacilityId: CHC_TEONTHAR.id,
        dueDate: '2026-01-01',
      }),
    ).rejects.toThrow(DomainError);
  });
});
