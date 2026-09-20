import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { closeStep, determineDowngrade } from '../../src/domain/ClosureService.js';
import { DomainError } from '../../src/domain/types.js';

describe('ClosureService.determineDowngrade', () => {
  it('is false only for AT_REFERRED_FACILITY', () => {
    expect(determineDowngrade('AT_REFERRED_FACILITY')).toBe(false);
    expect(determineDowngrade('OTHER_FACILITY')).toBe(true);
    expect(determineDowngrade('PRIVATE_PROVIDER')).toBe(true);
    expect(determineDowngrade('NOT_COMPLETED')).toBe(true);
  });
});

describe('ClosureService.closeStep', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('closes an open step owned by the actor and records the downgrade flag', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const closed = await closeStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'OTHER_FACILITY' });
    expect(closed.status).toBe('DONE');
    expect(closed.downgraded).toBe(true);
    expect(closed.provenance).toBe('OTHER_FACILITY');
  });

  it('allows staff at the destination facility to close it (Phase 4 forward-compat)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const closed = await closeStep({ actorUserId: PRIYA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' });
    expect(closed.status).toBe('DONE');
    expect(closed.closedByUserId).toBe(PRIYA.id);
  });

  it('rejects closing an already-closed step (spec §18)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    await closeStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' });

    await expect(
      closeStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' }),
    ).rejects.toThrow(DomainError);
  });
});
