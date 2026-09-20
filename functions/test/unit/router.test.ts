import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA } from '../../src/fixtures/seed.js';
import { getDb } from '../../src/domain/firestore.js';
import { routeInboundMessage } from '../../src/workflows/router.js';
import type { InboundMessage } from '../../src/webhook/inbound.js';

const UNREGISTERED_FROM = '911111111111'; // raw wa_id, no seeded user
const ANITA_FROM = '919800000101'; // ANITA.phoneNumber without the leading "+"

function textMessage(from: string, text: string): InboundMessage {
  return { from, whatsappMessageId: `wamid.${Math.random()}`, kind: 'text', text };
}

function interactiveMessage(from: string, replyId: string): InboundMessage {
  return { from, whatsappMessageId: `wamid.${Math.random()}`, kind: 'interactive', replyId };
}

describe('routeInboundMessage — spec §11/§18/§19 edge cases', () => {
  beforeEach(async () => {
    await clearFirestore();
    await loadFixtures();
  });

  it('tells an unregistered number it is not registered and leaks nothing else', async () => {
    const outbound = await routeInboundMessage(textMessage(UNREGISTERED_FROM, 'find Lakshmi'));
    expect(outbound).toEqual([{ kind: 'text', to: '+911111111111', body: 'You are not registered for this service.' }]);
  });

  it('gives an unregistered number no patient data even via a crafted interactive reply', async () => {
    const outbound = await routeInboundMessage(interactiveMessage(UNREGISTERED_FROM, 'cmd:WORKLIST'));
    expect(outbound).toEqual([{ kind: 'text', to: '+911111111111', body: 'You are not registered for this service.' }]);
  });

  it('responds with a helpful fallback to unrecognized free text', async () => {
    const outbound = await routeInboundMessage(textMessage(ANITA_FROM, 'asdkjhasd'));
    expect(outbound).toEqual([
      { kind: 'text', to: '+919800000101', body: "Sorry, I didn't understand that. Type menu to see your options." },
    ]);
  });

  it('rejects an unknown action token as a stale action (spec §18)', async () => {
    await routeInboundMessage(textMessage(ANITA_FROM, 'menu'));
    const outbound = await routeInboundMessage(interactiveMessage(ANITA_FROM, 'not-a-real-token'));
    expect(outbound).toEqual([
      { kind: 'text', to: '+919800000101', body: 'This action is no longer available. Please open the patient again.' },
    ]);
  });

  it('rejects an action token from an expired conversation (spec §2D/§18)', async () => {
    await routeInboundMessage(textMessage(ANITA_FROM, 'menu'));
    await getDb()
      .collection('conversations')
      .doc('+919800000101')
      .update({ expiresAt: new Date(Date.now() - 1000).toISOString() });

    const outbound = await routeInboundMessage(interactiveMessage(ANITA_FROM, 'any-token'));
    expect(outbound).toEqual([
      {
        kind: 'text',
        to: '+919800000101',
        body: 'That session has ended to protect patient information. Please find the patient again.',
      },
    ]);
  });

  it('shows Priya (STAFF_NURSE) the Expected arrivals menu item but not Anita (ANM)', async () => {
    const anitaMenu = await routeInboundMessage(textMessage(ANITA_FROM, 'menu'));
    const anitaRows = anitaMenu[0]!.kind === 'list' ? anitaMenu[0]!.sections.flatMap((s) => s.rows) : [];
    expect(anitaRows.some((r) => r.title === 'Expected arrivals')).toBe(false);

    const priyaMenu = await routeInboundMessage(textMessage('919800000102', 'menu'));
    const priyaRows = priyaMenu[0]!.kind === 'list' ? priyaMenu[0]!.sections.flatMap((s) => s.rows) : [];
    expect(priyaRows.some((r) => r.title === 'Expected arrivals')).toBe(true);
  });
});
