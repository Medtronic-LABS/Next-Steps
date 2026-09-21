import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, LAKSHMI_DEVI } from '../../src/fixtures/seed.js';
import { createPatient, searchPatients } from '../../src/domain/PatientService.js';
import { getDb, Collections } from '../../src/domain/firestore.js';
import { DomainError } from '../../src/domain/types.js';

describe('PatientService.createPatient', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('creates a patient with consent and programme context, and records PATIENT_CREATED', async () => {
    const patient = await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Sunita Rani',
      phoneNumber: '+919800000201',
      village: 'Rampur',
      age: 32,
      programmeId: 'RCH',
      programmeAttributes: { pregnancyStatus: 'HIGH_RISK' },
      whatsappReminderConsent: true,
    });

    expect(patient.displayName).toBe('Sunita Rani');
    expect(patient.programmeContexts).toEqual([{ programmeId: 'RCH', attributes: { pregnancyStatus: 'HIGH_RISK' } }]);
    expect(patient.whatsappReminderConsent).toBe(true);
    expect(patient.consentCapturedByUserId).toBe(ANITA.id);

    const auditSnap = await getDb()
      .collection(Collections.auditEvents)
      .where('patientId', '==', patient.id)
      .where('eventType', '==', 'PATIENT_CREATED')
      .get();
    expect(auditSnap.size).toBe(1);

    const cceSnap = await getDb()
      .collection(Collections.cceOutbox)
      .where('payload.patientId', '==', patient.id)
      .get();
    expect(cceSnap.size).toBe(1);
  });

  it('rejects creation by an unknown actor', async () => {
    await expect(
      createPatient({
        actorUserId: 'GHOST',
        displayName: 'X',
        phoneNumber: '+911',
        village: 'Rampur',
        whatsappReminderConsent: false,
      }),
    ).rejects.toThrow(DomainError);
  });

  it('a newly created patient is findable via search', async () => {
    await createPatient({
      actorUserId: ANITA.id,
      displayName: 'Meena Kumari',
      phoneNumber: '+919800000202',
      village: 'Rampur',
      whatsappReminderConsent: false,
    });

    const matches = await searchPatients('Meena');
    expect(matches.map((p) => p.displayName)).toEqual(['Meena Kumari']);
  });

  it('does not interfere with the existing seeded patient search', async () => {
    const matches = await searchPatients('Lakshmi');
    expect(matches.map((p) => p.id)).toEqual([LAKSHMI_DEVI.id]);
  });
});
