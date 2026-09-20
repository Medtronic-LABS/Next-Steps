export interface InboundMessage {
  from: string; // raw wa_id, e.g. "919876543210" — normalize before use
  whatsappMessageId: string;
  kind: 'text' | 'interactive' | 'flow_reply';
  text?: string;
  replyId?: string; // button_reply.id or list_reply.id
  flowName?: string; // nfm_reply.name — which Flow was completed
  flowResponse?: Record<string, unknown>; // nfm_reply.response_json, parsed
}

export interface InboundStatus {
  whatsappMessageId: string;
  status: string;
}

interface RawWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from: string;
          id: string;
          type: string;
          text?: { body?: string };
          interactive?: {
            type?: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string };
            nfm_reply?: { name?: string; body?: string; response_json?: string };
          };
        }[];
        statuses?: { id: string; status: string }[];
      };
    }[];
  }[];
}

export function parseWebhookPayload(body: unknown): {
  messages: InboundMessage[];
  statuses: InboundStatus[];
} {
  // Spec §19 "webhook payload validation" — a malformed/empty body must never
  // throw; it just yields no messages or statuses to process.
  const payload = (body ?? {}) as RawWebhookPayload;
  const messages: InboundMessage[] = [];
  const statuses: InboundStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const m of value?.messages ?? []) {
        if (m.type === 'text') {
          messages.push({ from: m.from, whatsappMessageId: m.id, kind: 'text', text: m.text?.body ?? '' });
        } else if (m.type === 'interactive') {
          const nfmReply = m.interactive?.nfm_reply;
          if (nfmReply?.response_json) {
            // A completed WhatsApp Flow submission — carries its own payload,
            // not an opaque action token (spec §9 tokens don't apply here;
            // the Flow's own screen fields are the state).
            let flowResponse: Record<string, unknown>;
            try {
              flowResponse = JSON.parse(nfmReply.response_json) as Record<string, unknown>;
            } catch {
              continue; // malformed Flow payload — spec §19, never throw on bad input
            }
            messages.push({
              from: m.from,
              whatsappMessageId: m.id,
              kind: 'flow_reply',
              flowName: nfmReply.name,
              flowResponse,
            });
            continue;
          }
          const replyId = m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id;
          if (replyId) {
            messages.push({ from: m.from, whatsappMessageId: m.id, kind: 'interactive', replyId });
          }
        }
      }
      for (const s of value?.statuses ?? []) {
        statuses.push({ whatsappMessageId: s.id, status: s.status });
      }
    }
  }

  return { messages, statuses };
}
