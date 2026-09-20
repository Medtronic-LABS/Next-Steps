import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { closeStep } from '../../src/domain/ClosureService.js';
import { recordContactOutcome } from '../../src/domain/ContactOutcomeService.js';
import { DomainError } from '../../src/domain/types.js';

describe('ContactOutcomeService.recordContactOutcome', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('appends a contact outcome to the step audit trail (spec §2B)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const updated = await recordContactOutcome({ actorUserId: ANITA.id, stepId: step.id, outcome: 'NO_ANSWER' });
    expect(updated.contactOutcomes).toEqual([
      { outcome: 'NO_ANSWER', byUserId: ANITA.id, at: expect.any(String) },
    ]);
  });

  it('appends multiple outcomes in call order without overwriting earlier ones', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    await recordContactOutcome({ actorUserId: ANITA.id, stepId: step.id, outcome: 'NO_ANSWER' });
    const updated = await recordContactOutcome({ actorUserId: ANITA.id, stepId: step.id, outcome: 'SPOKE_TO_PATIENT' });
    expect(updated.contactOutcomes.map((c) => c.outcome)).toEqual(['NO_ANSWER', 'SPOKE_TO_PATIENT']);
  });

  it('rejects recording a contact outcome by anyone other than the owning ANM', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    await expect(
      recordContactOutcome({ actorUserId: PRIYA.id, stepId: step.id, outcome: 'NO_ANSWER' }),
    ).rejects.toThrow(DomainError);
  });

  it('rejects recording a contact outcome on an already-closed step (spec §18)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    await closeStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' });

    await expect(
      recordContactOutcome({ actorUserId: ANITA.id, stepId: step.id, outcome: 'WRONG_NUMBER' }),
    ).rejects.toThrow(DomainError);
  });
});
