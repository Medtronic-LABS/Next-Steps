import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { dispatchOverdueAlerts } from '../../src/domain/AlertService.js';
import { getWhatsAppClient, MockWhatsAppClient } from '../../src/adapter/WhatsAppClient.js';

describe('AlertService.dispatchOverdueAlerts', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
    const client = getWhatsAppClient();
    if (client instanceof MockWhatsAppClient) client.reset();
  });

  it('sends a care_step_overdue_v1 template to the owner for an overdue open step', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2020-01-01',
    });

    const alerts = await dispatchOverdueAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.deliveryStatus).toBe('SENT');
    expect(alerts[0]!.recipientUserId).toBe(ANITA.id);

    const client = getWhatsAppClient() as MockWhatsAppClient;
    expect(client.sent).toHaveLength(1);
    const sent = client.sent[0]!;
    expect(sent.kind).toBe('template');
    if (sent.kind === 'template') {
      expect(sent.templateName).toBe('care_step_overdue_v1');
      expect(sent.to).toBe(ANITA.phoneNumber);
      expect(sent.params.patient_display).toBe(LAKSHMI_DEVI.displayName);
    }
  });

  it('does not send a duplicate alert for the same step on a second run the same day', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2020-01-01',
    });

    await dispatchOverdueAlerts();
    const second = await dispatchOverdueAlerts();
    expect(second).toHaveLength(0);

    const client = getWhatsAppClient() as MockWhatsAppClient;
    expect(client.sent).toHaveLength(1);
  });

  it('does not alert for a step that is not yet due', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2099-01-01',
    });

    const alerts = await dispatchOverdueAlerts();
    expect(alerts).toHaveLength(0);
  });
});
