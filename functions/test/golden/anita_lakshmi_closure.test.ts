import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
import { getDb, Collections } from '../../src/domain/firestore.js';
import { ConversationReplay, type Turn } from './replay.js';
import type { OutboundMessage } from '../../src/adapter/WhatsAppClient.js';

const turns = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/anita_lakshmi_closure.json', import.meta.url)), 'utf8'),
) as Turn[];

function bodies(messages: OutboundMessage[]): string[] {
  return messages.flatMap((m) => (m.kind === 'template' ? [] : [m.body]));
}

describe('golden: Anita closes an already-open referral for Lakshmi Devi', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('replays the full conversation, resolving provenance and downgrade', async () => {
    const existingStep = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: new Date().toISOString().slice(0, 10),
    });

    const replay = new ConversationReplay();

    await replay.run(turns[0]!); // menu
    // Only Lakshmi Devi exists and has exactly one open step, so "Find a
    // patient" auto-selects both her and that step directly.
    const stepActions = await replay.run(turns[1]!); // Find a patient
    expect(bodies(stepActions)[0]).toContain('What would you like to do?');

    const provenancePrompt = await replay.run(turns[2]!); // Completed
    expect(bodies(provenancePrompt)[0]).toContain('What happened with this referral?');

    const closed = await replay.run(turns[3]!); // Seen at the referred facility
    expect(bodies(closed)[0]).toContain('Referral completed as intended');

    // Expected Firebase state
    const stepDoc = await getDb().collection(Collections.careSteps).doc(existingStep.id).get();
    const step = stepDoc.data()!;
    expect(step.status).toBe('DONE');
    expect(step.provenance).toBe('AT_REFERRED_FACILITY');
    expect(step.downgraded).toBe(false);
    expect(step.closedByUserId).toBe(ANITA.id);

    // Expected audit event
    const auditSnap = await getDb()
      .collection(Collections.auditEvents)
      .where('stepId', '==', existingStep.id)
      .where('eventType', '==', 'STEP_CLOSED')
      .get();
    expect(auditSnap.size).toBe(1);
    expect(auditSnap.docs[0]!.data().downgraded).toBe(false);

    // Expected CCE outbox event
    const cceSnap = await getDb()
      .collection(Collections.cceOutbox)
      .where('payload.stepId', '==', existingStep.id)
      .where('payload.eventType', '==', 'STEP_CLOSED')
      .get();
    expect(cceSnap.size).toBe(1);
  });
});
