import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { getDb, Collections } from '../../src/domain/firestore.js';
import { ConversationReplay, type Turn } from './replay.js';
import type { OutboundMessage } from '../../src/adapter/WhatsAppClient.js';

const turns = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/anita_lakshmi_referral.json', import.meta.url)), 'utf8'),
) as Turn[];

function bodies(messages: OutboundMessage[]): string[] {
  return messages.flatMap((m) => (m.kind === 'template' ? [] : [m.body]));
}

describe('golden: Anita stages and confirms a referral for Lakshmi Devi', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('replays the full conversation and produces the expected Firebase state', async () => {
    const replay = new ConversationReplay();

    const menu = await replay.run(turns[0]!);
    expect(bodies(menu)[0]).toContain('What do you need?');

    const prompt = await replay.run(turns[1]!);
    expect(bodies(prompt)[0]).toContain('find <patient name>');

    const summary = await replay.run(turns[2]!);
    expect(bodies(summary)[0]).toContain(`${LAKSHMI_DEVI.displayName} has no open steps.`);

    const confirmPrompt = await replay.run(turns[3]!);
    expect(bodies(confirmPrompt)[0]).toContain(CHC_TEONTHAR.name);

    const confirmed = await replay.run(turns[4]!);
    expect(bodies(confirmed)[0]).toContain(`Referral to ${CHC_TEONTHAR.name} confirmed.`);

    // Expected Firebase state
    const stepsSnap = await getDb()
      .collection(Collections.careSteps)
      .where('patientId', '==', LAKSHMI_DEVI.id)
      .get();
    expect(stepsSnap.size).toBe(1);
    const step = stepsSnap.docs[0]!.data();
    expect(step.status).toBe('OPEN');
    expect(step.ownerUserId).toBe(ANITA.id);
    expect(step.destinationFacilityId).toBe(CHC_TEONTHAR.id);

    // Expected audit event
    const auditSnap = await getDb()
      .collection(Collections.auditEvents)
      .where('stepId', '==', step.id)
      .get();
    expect(auditSnap.size).toBe(1);
    expect(auditSnap.docs[0]!.data().eventType).toBe('REFERRAL_CONFIRMED');

    // Expected CCE outbox event
    const cceSnap = await getDb()
      .collection(Collections.cceOutbox)
      .where('payload.stepId', '==', step.id)
      .get();
    expect(cceSnap.size).toBe(1);
    expect(cceSnap.docs[0]!.data().status).toBe('PENDING');
    expect(cceSnap.docs[0]!.data().payload.eventType).toBe('REFERRAL_CONFIRMED');
  });
});
