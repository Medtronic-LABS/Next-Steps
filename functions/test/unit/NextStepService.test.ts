import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { createPatient } from '../../src/domain/PatientService.js';
import { createNextStep, completeNextStep } from '../../src/domain/NextStepService.js';
import { DomainError } from '../../src/domain/types.js';

describe('NextStepService', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('creates a non-facility-routed step (e.g. ANC) without a destination facility, due in the category default window', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Sunita Rani',
      phoneNumber: '+919800000201',
      village: 'Rampur',
      whatsappReminderConsent: false,
    });

    const step = await createNextStep({
      actorUserId: ANITA.id,
      patientId: patient.id,
      programmeId: 'RCH',
      categoryId: 'ANC',
    });

    expect(step.kind).toBe('ANC');
    expect(step.status).toBe('OPEN');
    expect(step.destinationFacilityId).toBe(ANITA.facilityId);
  });

  it('condition-neutrality: the same mechanism creates a HYPERTENSION step for a non-RCH patient', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Ramesh Kumar',
      phoneNumber: '+919800000203',
      village: 'Rampur',
      programmeId: 'HYPERTENSION',
      whatsappReminderConsent: false,
    });

    const step = await createNextStep({
      actorUserId: ANITA.id,
      patientId: patient.id,
      programmeId: 'HYPERTENSION',
      categoryId: 'FOLLOW_UP',
    });

    expect(step.kind).toBe('FOLLOW_UP');
    expect(step.status).toBe('OPEN');
  });

  it('rejects a facility-routed category (REFERRAL) with no destination facility', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Sunita Rani',
      phoneNumber: '+919800000201',
      village: 'Rampur',
      whatsappReminderConsent: false,
    });

    await expect(
      createNextStep({ actorUserId: ANITA.id, patientId: patient.id, programmeId: 'RCH', categoryId: 'REFERRAL' }),
    ).rejects.toThrow(DomainError);
  });

  it('rejects an unknown category', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Sunita Rani',
      phoneNumber: '+919800000201',
      village: 'Rampur',
      whatsappReminderConsent: false,
    });

    await expect(
      createNextStep({ actorUserId: ANITA.id, patientId: patient.id, programmeId: 'RCH', categoryId: 'NOT_REAL' }),
    ).rejects.toThrow(DomainError);
  });

  it('completeNextStep without a provenance simply closes a non-referral step', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Sunita Rani',
      phoneNumber: '+919800000201',
      village: 'Rampur',
      whatsappReminderConsent: false,
    });
    const step = await createNextStep({
      actorUserId: ANITA.id,
      patientId: patient.id,
      programmeId: 'RCH',
      categoryId: 'ANC',
    });

    const completed = await completeNextStep({ actorUserId: ANITA.id, stepId: step.id });
    expect(completed.status).toBe('DONE');
    expect(completed.provenance).toBeNull();
  });

  it('completeNextStep with a provenance delegates to the REFERRAL closure/downgrade machinery', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Sunita Rani',
      phoneNumber: '+919800000201',
      village: 'Rampur',
      whatsappReminderConsent: false,
    });
    const step = await createNextStep({
      actorUserId: ANITA.id,
      patientId: patient.id,
      programmeId: 'RCH',
      categoryId: 'REFERRAL',
      destinationFacilityId: CHC_TEONTHAR.id,
    });

    const completed = await completeNextStep({ actorUserId: ANITA.id, stepId: step.id, provenance: 'OTHER_FACILITY' });
    expect(completed.status).toBe('DONE');
    expect(completed.provenance).toBe('OTHER_FACILITY');
    expect(completed.downgraded).toBe(true);
  });
});
