import { describe, expect, it } from 'vitest';
import { parseWebhookPayload } from '../../src/webhook/inbound.js';

function payload(value: Record<string, unknown>) {
  return { entry: [{ changes: [{ value }] }] };
}

describe('parseWebhookPayload (spec §15/§19 webhook payload validation)', () => {
  it('parses a text message', () => {
    const { messages } = parseWebhookPayload(
      payload({ messages: [{ from: '919800000101', id: 'wamid.1', type: 'text', text: { body: 'menu' } }] }),
    );
    expect(messages).toEqual([{ from: '919800000101', whatsappMessageId: 'wamid.1', kind: 'text', text: 'menu' }]);
  });

  it('parses an interactive button reply', () => {
    const { messages } = parseWebhookPayload(
      payload({
        messages: [
          {
            from: '919800000101',
            id: 'wamid.2',
            type: 'interactive',
            interactive: { type: 'button_reply', button_reply: { id: 'cmd:MENU', title: 'Menu' } },
          },
        ],
      }),
    );
    expect(messages).toEqual([{ from: '919800000101', whatsappMessageId: 'wamid.2', kind: 'interactive', replyId: 'cmd:MENU' }]);
  });

  it('parses an interactive list reply', () => {
    const { messages } = parseWebhookPayload(
      payload({
        messages: [
          {
            from: '919800000101',
            id: 'wamid.3',
            type: 'interactive',
            interactive: { type: 'list_reply', list_reply: { id: 'action-token', title: 'Find a patient' } },
          },
        ],
      }),
    );
    expect(messages).toEqual([{ from: '919800000101', whatsappMessageId: 'wamid.3', kind: 'interactive', replyId: 'action-token' }]);
  });

  it('parses a completed WhatsApp Flow reply (nfm_reply)', () => {
    const { messages } = parseWebhookPayload(
      payload({
        messages: [
          {
            from: '919800000101',
            id: 'wamid.flow1',
            type: 'interactive',
            interactive: {
              type: 'nfm_reply',
              nfm_reply: {
                name: 'flow',
                body: 'Sent',
                response_json: '{"provenance":"AT_REFERRED_FACILITY","step_id":"step-1","patient_id":"LAKSHMI_DEVI"}',
              },
            },
          },
        ],
      }),
    );
    expect(messages).toEqual([
      {
        from: '919800000101',
        whatsappMessageId: 'wamid.flow1',
        kind: 'flow_reply',
        flowName: 'flow',
        flowResponse: { provenance: 'AT_REFERRED_FACILITY', step_id: 'step-1', patient_id: 'LAKSHMI_DEVI' },
      },
    ]);
  });

  it('drops a Flow reply with malformed response_json rather than throwing', () => {
    const { messages } = parseWebhookPayload(
      payload({
        messages: [
          {
            from: '919800000101',
            id: 'wamid.flow2',
            type: 'interactive',
            interactive: { type: 'nfm_reply', nfm_reply: { name: 'flow', response_json: 'not json' } },
          },
        ],
      }),
    );
    expect(messages).toEqual([]);
  });

  it('drops an interactive message with neither button_reply nor list_reply', () => {
    const { messages } = parseWebhookPayload(
      payload({ messages: [{ from: '919800000101', id: 'wamid.4', type: 'interactive', interactive: {} }] }),
    );
    expect(messages).toEqual([]);
  });

  it('ignores unsupported message types (e.g. image, unknown) without throwing', () => {
    const { messages } = parseWebhookPayload(
      payload({ messages: [{ from: '919800000101', id: 'wamid.5', type: 'image' }] }),
    );
    expect(messages).toEqual([]);
  });

  it('parses message-status updates separately from messages', () => {
    const { messages, statuses } = parseWebhookPayload(
      payload({ statuses: [{ id: 'wamid.1', status: 'delivered' }] }),
    );
    expect(messages).toEqual([]);
    expect(statuses).toEqual([{ whatsappMessageId: 'wamid.1', status: 'delivered' }]);
  });

  it('handles multiple entries/changes in one payload', () => {
    const body = {
      entry: [
        { changes: [{ value: { messages: [{ from: '1', id: 'a', type: 'text', text: { body: 'hi' } }] } }] },
        { changes: [{ value: { statuses: [{ id: 'a', status: 'sent' }] } }] },
      ],
    };
    const { messages, statuses } = parseWebhookPayload(body);
    expect(messages).toHaveLength(1);
    expect(statuses).toHaveLength(1);
  });

  it('returns empty arrays for a payload with no entries (spec §19 payload validation)', () => {
    expect(parseWebhookPayload({})).toEqual({ messages: [], statuses: [] });
    expect(parseWebhookPayload(null)).toEqual({ messages: [], statuses: [] });
  });
});
