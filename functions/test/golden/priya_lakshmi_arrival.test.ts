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

describe('golden: Priya marks a referral to CHC Teonthar as Arrived', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('replays the full conversation — Arrived from Expected Arrivals records arrival and closes the step in one tap (addendum §8)', async () => {
    const existingStep = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: new Date().toISOString().slice(0, 10),
    });

    const replay = new ConversationReplay();

    const menu = await replay.run(turns[0]!); // menu
    expect(bodies(menu)[0]).toContain('What do you need?');

    const arrivalsList = await replay.run(turns[1]!); // Expected arrivals
    expect(bodies(arrivalsList)[0]).toContain('expected');

    const arrivalPrompt = await replay.run(turns[2]!); // Lakshmi Devi -> inline Arrived/Not arrived
    expect(bodies(arrivalPrompt)[0]).toContain('Referral from');

    const closed = await replay.run(turns[3]!); // Arrived
    expect(bodies(closed)[0]).toContain('Referral completed as intended');

    // Expected Firebase state — arrived AND closed, both fields set by one tap.
    const stepDoc = await getDb().collection(Collections.careSteps).doc(existingStep.id).get();
    const step = stepDoc.data()!;
    expect(step.status).toBe('DONE');
    expect(step.arrivedByUserId).toBe(PRIYA.id);
    expect(step.arrivalFacilityId).toBe(CHC_TEONTHAR.id);
    expect(step.arrivedAt).not.toBeNull();
    expect(step.provenance).toBe('AT_REFERRED_FACILITY');
    expect(step.closedByUserId).toBe(PRIYA.id);

    // Expected audit events — REFERRAL_CONFIRMED from setup, then arrival
    // and closure both recorded by the single "Arrived" tap.
    const auditSnap = await getDb()
      .collection(Collections.auditEvents)
      .where('stepId', '==', existingStep.id)
      .get();
    const eventTypes = auditSnap.docs.map((d) => d.data().eventType).sort();
    expect(eventTypes).toEqual(['ARRIVAL_RECORDED', 'REFERRAL_CONFIRMED', 'STEP_CLOSED']);

    // Expected CCE outbox events — one per transition (setup's confirmStep + arrival + closure).
    const cceSnap = await getDb()
      .collection(Collections.cceOutbox)
      .where('payload.stepId', '==', existingStep.id)
      .get();
    expect(cceSnap.size).toBe(3);
  });
});
