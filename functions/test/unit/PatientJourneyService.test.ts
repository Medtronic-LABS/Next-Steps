import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { closeStep } from '../../src/domain/ClosureService.js';
import { createNextStep } from '../../src/domain/NextStepService.js';
import { getPatientJourney } from '../../src/domain/PatientJourneyService.js';
import { DomainError } from '../../src/domain/types.js';

describe('PatientJourneyService.getPatientJourney', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('separates open, overdue, and completed steps, and picks the earliest-due as next due action', async () => {
    const overdueStep = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2020-01-01',
    });
    const anc = await createNextStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      programmeId: 'RCH',
      categoryId: 'ANC',
      dueDate: '2099-01-01',
    });
    const completedStep = await createNextStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      programmeId: 'RCH',
      categoryId: 'DIAGNOSTIC',
      dueDate: '2026-01-01',
    });
    await closeStep({ actorUserId: ANITA.id, stepId: completedStep.id, provenance: 'NOT_COMPLETED' });

    const journey = await getPatientJourney(LAKSHMI_DEVI.id);

    expect(journey.openSteps.map((s) => s.id).sort()).toEqual([overdueStep.id, anc.id].sort());
    expect(journey.overdueSteps.map((s) => s.id)).toEqual([overdueStep.id]);
    expect(journey.completedSteps.map((s) => s.id)).toEqual([completedStep.id]);
    expect(journey.referrals.map((s) => s.id)).toEqual([overdueStep.id]);
    expect(journey.nextDueAction?.id).toBe(overdueStep.id);
  });

  it('always regenerates from current state — closing a step moves it out of open/overdue on the next read', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2020-01-01',
    });

    const before = await getPatientJourney(LAKSHMI_DEVI.id);
    expect(before.overdueSteps).toHaveLength(1);

    await closeStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'AT_REFERRED_FACILITY' });

    const after = await getPatientJourney(LAKSHMI_DEVI.id);
    expect(after.overdueSteps).toHaveLength(0);
    expect(after.completedSteps.map((s) => s.id)).toEqual([step.id]);
  });

  it('throws for an unknown patient', async () => {
    await expect(getPatientJourney('GHOST')).rejects.toThrow(DomainError);
  });
});
