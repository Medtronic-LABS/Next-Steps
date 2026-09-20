import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { closeStep } from '../../src/domain/ClosureService.js';
import { rescheduleStep } from '../../src/domain/RescheduleService.js';
import { DomainError } from '../../src/domain/types.js';

describe('RescheduleService.rescheduleStep', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('moves the due date and appends to the reschedule history', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const updated = await rescheduleStep({ actorUserId: ANITA.id, stepId: step.id, toDate: '2026-01-08' });
    expect(updated.dueDate).toBe('2026-01-08');
    expect(updated.rescheduleHistory).toEqual([
      { fromDate: '2026-01-01', toDate: '2026-01-08', byUserId: ANITA.id, at: expect.any(String) },
    ]);
  });

  it('rejects rescheduling by anyone other than the owning ANM', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    await expect(rescheduleStep({ actorUserId: PRIYA.id, stepId: step.id, toDate: '2026-01-08' })).rejects.toThrow(
      DomainError,
    );
  });

  it('rejects rescheduling an already-closed step (spec §18)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    await closeStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' });

    await expect(
      rescheduleStep({ actorUserId: ANITA.id, stepId: step.id, toDate: '2026-01-08' }),
    ).rejects.toThrow(DomainError);
  });
});
