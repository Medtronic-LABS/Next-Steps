import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { dispatchExpectedArrivalsSummaries, dispatchWorkDueTodaySummaries } from '../../src/domain/AlertService.js';
import { getWhatsAppClient, MockWhatsAppClient } from '../../src/adapter/WhatsAppClient.js';

describe('AlertService daily summary dispatchers', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
    const client = getWhatsAppClient();
    if (client instanceof MockWhatsAppClient) client.reset();
  });

  it('sends work_due_today_v1 to an ANM with a step due today, not to one with none', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: today,
    });

    const alerts = await dispatchWorkDueTodaySummaries();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.recipientUserId).toBe(ANITA.id);
    expect(alerts[0]!.count).toBe(1);

    const client = getWhatsAppClient() as MockWhatsAppClient;
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0]).toMatchObject({ kind: 'template', templateName: 'work_due_today_v1', to: ANITA.phoneNumber });
  });

  it('does not resend work_due_today_v1 to the same ANM twice in one day', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: today,
    });

    await dispatchWorkDueTodaySummaries();
    const second = await dispatchWorkDueTodaySummaries();
    expect(second).toHaveLength(0);
  });

  it('sends expected_arrivals_summary_v1 to a STAFF_NURSE whose facility has an unarrived referral', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2099-01-01',
    });

    const alerts = await dispatchExpectedArrivalsSummaries();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.recipientUserId).toBe(PRIYA.id);
    expect(alerts[0]!.count).toBe(1);

    const client = getWhatsAppClient() as MockWhatsAppClient;
    expect(client.sent[0]).toMatchObject({
      kind: 'template',
      templateName: 'expected_arrivals_summary_v1',
      to: PRIYA.phoneNumber,
    });
  });

  it('does not send expected_arrivals_summary_v1 when nothing is expected', async () => {
    const alerts = await dispatchExpectedArrivalsSummaries();
    expect(alerts).toHaveLength(0);
  });
});
