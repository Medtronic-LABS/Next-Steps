import { beforeEach, describe, expect, it } from 'vitest';
import '../setup.js';
import { clearFirestore } from '../setup.js';
import { loadFixtures } from '../../src/fixtures/loadFixtures.js';
import { ANITA, LAKSHMI_DEVI, CHC_TEONTHAR } from '../../src/fixtures/seed.js';
import { confirmStep } from '../../src/domain/ReferralService.js';
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

function flowReplyMessage(from: string, flowResponse: Record<string, unknown>): InboundMessage {
  return { from, whatsappMessageId: `wamid.${Math.random()}`, kind: 'flow_reply', flowName: 'flow', flowResponse };
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

  it('shows Priya (STAFF_NURSE) the Expected arrivals menu item but not Anita (ANM), via buttons + More', async () => {
    const anitaMenu = await routeInboundMessage(textMessage(ANITA_FROM, 'menu'));
    expect(anitaMenu[0]).toMatchObject({ kind: 'buttons' });
    expect((anitaMenu[0] as { body: string }).body).not.toContain('Expected arrivals');
    const anitaMore = anitaMenu[0]!.kind === 'buttons' ? anitaMenu[0]!.buttons.find((b) => b.title === 'More') : undefined;
    expect(anitaMore).toBeDefined();
    const anitaMoreMenu = await routeInboundMessage(interactiveMessage(ANITA_FROM, anitaMore!.id));
    const anitaMoreButtons = anitaMoreMenu[0]!.kind === 'buttons' ? anitaMoreMenu[0]!.buttons : [];
    expect(anitaMoreButtons.some((b) => b.title === 'Expected arrivals')).toBe(false);
    expect(anitaMoreButtons.some((b) => b.title === 'Add next step')).toBe(true);
    expect(anitaMoreButtons.some((b) => b.title === 'Alerts')).toBe(true);

    const priyaMenu = await routeInboundMessage(textMessage('919800000102', 'menu'));
    const priyaMore = priyaMenu[0]!.kind === 'buttons' ? priyaMenu[0]!.buttons.find((b) => b.title === 'More') : undefined;
    const priyaMoreMenu = await routeInboundMessage(interactiveMessage('919800000102', priyaMore!.id));
    const priyaMoreButtons = priyaMoreMenu[0]!.kind === 'buttons' ? priyaMoreMenu[0]!.buttons : [];
    expect(priyaMoreButtons.some((b) => b.title === 'Expected arrivals')).toBe(true);
  });

  it('closes a step from a completed WhatsApp Flow reply', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const outbound = await routeInboundMessage(
      flowReplyMessage(ANITA_FROM, { provenance: 'AT_REFERRED_FACILITY', step_id: step.id, patient_id: LAKSHMI_DEVI.id }),
    );
    expect(outbound[0]).toMatchObject({ kind: 'text', body: expect.stringContaining('Referral completed as intended') });

    const stepDoc = await getDb().collection('careSteps').doc(step.id).get();
    expect(stepDoc.data()!.status).toBe('DONE');
  });

  it('falls back to unrecognized on a Flow reply with an invalid provenance value', async () => {
    const outbound = await routeInboundMessage(
      flowReplyMessage(ANITA_FROM, { provenance: 'NOT_A_REAL_VALUE', step_id: 'step-1' }),
    );
    expect(outbound).toEqual([
      { kind: 'text', to: '+919800000101', body: "Sorry, I didn't understand that. Type menu to see your options." },
    ]);
  });

  it('falls back to unrecognized on a Flow reply missing step_id', async () => {
    const outbound = await routeInboundMessage(flowReplyMessage(ANITA_FROM, { provenance: 'AT_REFERRED_FACILITY' }));
    expect(outbound).toEqual([
      { kind: 'text', to: '+919800000101', body: "Sorry, I didn't understand that. Type menu to see your options." },
    ]);
  });

  it('selects a patient from a select-item Flow reply (kind: patient)', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const outbound = await routeInboundMessage(
      flowReplyMessage(ANITA_FROM, { kind: 'patient', selected_id: LAKSHMI_DEVI.id }),
    );
    // Lakshmi has exactly one open step, so this goes straight to step actions.
    expect(outbound[0]).toMatchObject({ kind: 'buttons', body: 'What would you like to do?' });
  });

  it('selects a step from a select-item Flow reply (kind: step, composite id)', async () => {
    const step = await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });

    const outbound = await routeInboundMessage(
      flowReplyMessage(ANITA_FROM, { kind: 'step', selected_id: `${LAKSHMI_DEVI.id}::${step.id}` }),
    );
    expect(outbound[0]).toMatchObject({ kind: 'buttons', body: 'What would you like to do?' });
  });

  it('falls back to unrecognized on a step Flow reply with a malformed composite id', async () => {
    const outbound = await routeInboundMessage(
      flowReplyMessage(ANITA_FROM, { kind: 'step', selected_id: 'no-separator-here' }),
    );
    expect(outbound).toEqual([
      { kind: 'text', to: '+919800000101', body: "Sorry, I didn't understand that. Type menu to see your options." },
    ]);
  });

  it('leaves an empty worklist as plain text even with FLOW_SELECT_ITEM_ID configured (nothing to select)', async () => {
    process.env.FLOW_SELECT_ITEM_ID = 'test-select-flow-id';
    try {
      const worklist = await routeInboundMessage(interactiveMessage(ANITA_FROM, 'cmd:WORKLIST'));
      expect(worklist[0]).toMatchObject({ kind: 'text', body: 'Nothing overdue or due today.' });
    } finally {
      delete process.env.FLOW_SELECT_ITEM_ID;
    }
  });

  it('sends the worklist Flow instead of the flat list when FLOW_SELECT_ITEM_ID is configured and steps exist', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: new Date().toISOString().slice(0, 10),
    });
    process.env.FLOW_SELECT_ITEM_ID = 'test-select-flow-id';
    try {
      const worklist = await routeInboundMessage(interactiveMessage(ANITA_FROM, 'cmd:WORKLIST'));
      expect(worklist[0]).toMatchObject({ kind: 'flow', flowId: 'test-select-flow-id' });
    } finally {
      delete process.env.FLOW_SELECT_ITEM_ID;
    }
  });

  it('sends the closure Flow instead of the flat list when FLOW_CLOSURE_PROVENANCE_ID is configured', async () => {
    await confirmStep({
      actorUserId: ANITA.id,
      patientId: LAKSHMI_DEVI.id,
      destinationFacilityId: CHC_TEONTHAR.id,
      dueDate: '2026-01-01',
    });
    process.env.FLOW_CLOSURE_PROVENANCE_ID = 'test-flow-id';
    try {
      // Lakshmi has exactly one open step, so "find Lakshmi" auto-selects it
      // straight to renderStepActions: [Call, Completed, Reschedule].
      const stepActions = await routeInboundMessage(textMessage(ANITA_FROM, 'find Lakshmi'));
      const closeToken = stepActions[0]!.kind === 'buttons' ? stepActions[0]!.buttons[1]!.id : undefined;
      const outbound = await routeInboundMessage(interactiveMessage(ANITA_FROM, closeToken!));
      expect(outbound[0]).toMatchObject({ kind: 'flow', flowId: 'test-flow-id' });
    } finally {
      delete process.env.FLOW_CLOSURE_PROVENANCE_ID;
    }
  });
});
