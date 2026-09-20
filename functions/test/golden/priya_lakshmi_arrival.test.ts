import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, PRIYA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { getDb, Collections } from '../../src/domain/firestore.js';
import { ConversationReplay, type Turn } from './replay.js';
import type { OutboundMessage } from '../../src/adapter/WhatsAppClient.js';

const turns = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/priya_lakshmi_arrival.json', import.meta.url)), 'utf8'),
) as Turn[];

function bodies(messages: OutboundMessage[]): string[] {
  return messages.flatMap((m) => (m.kind === 'template' ? [] : [m.body]));
}

describe('golden: Priya confirms arrival for a referral to CHC Teonthar', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('replays the full conversation, recording arrival without closing the step', async () => {
    const existingStep = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: new Date().toISOString().slice(0, 10),
    });

    const replay = new ConversationReplay();

    const menu = await replay.run(turns[0]!); // menu
    expect(bodies(menu)[0]).toContain('What would you like to do?');

    const arrivalsList = await replay.run(turns[1]!); // Expected arrivals
    expect(bodies(arrivalsList)[0]).toContain('expected');

    const stepActions = await replay.run(turns[2]!); // Lakshmi Devi -> her open step
    expect(bodies(stepActions)[0]).toContain('What would you like to do?');

    const confirmed = await replay.run(turns[3]!); // Confirm arrival
    expect(bodies(confirmed)[0]).toContain('Arrival recorded');

    // Expected Firebase state — arrived, but not closed (spec §2A).
    const stepDoc = await getDb().collection(Collections.careSteps).doc(existingStep.id).get();
    const step = stepDoc.data()!;
    expect(step.status).toBe('OPEN');
    expect(step.arrivedByUserId).toBe(PRIYA.id);
    expect(step.arrivalFacilityId).toBe(CHC_TEONTHAR.id);
    expect(step.arrivedAt).not.toBeNull();

    // Expected audit event
    const auditSnap = await getDb()
      .collection(Collections.auditEvents)
      .where('stepId', '==', existingStep.id)
      .where('eventType', '==', 'ARRIVAL_RECORDED')
      .get();
    expect(auditSnap.size).toBe(1);
    expect(auditSnap.docs[0]!.data().actorUserId).toBe(PRIYA.id);

    // Expected CCE outbox event
    const cceSnap = await getDb()
      .collection(Collections.cceOutbox)
      .where('payload.stepId', '==', existingStep.id)
      .where('payload.eventType', '==', 'ARRIVAL_RECORDED')
      .get();
    expect(cceSnap.size).toBe(1);
  });
});
