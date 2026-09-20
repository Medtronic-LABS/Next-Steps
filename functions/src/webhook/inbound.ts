export interface InboundMessage {
  from: string; // raw wa_id, e.g. "919876543210" — normalize before use
  whatsappMessageId: string;
  kind: 'text' | 'interactive';
  text?: string;
  replyId?: string; // button_reply.id or list_reply.id
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
  const payload = body as RawWebhookPayload;
  const messages: InboundMessage[] = [];
  const statuses: InboundStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const m of value?.messages ?? []) {
        if (m.type === 'text') {
          messages.push({ from: m.from, whatsappMessageId: m.id, kind: 'text', text: m.text?.body ?? '' });
        } else if (m.type === 'interactive') {
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
