import { randomUUID } from 'node:crypto';

export interface ButtonSpec {
  id: string; // opaque action token
  title: string; // <= 20 chars per WhatsApp limits
}

export interface ListRow {
  id: string; // opaque action token
  title: string;
  description?: string;
}

export interface ListSection {
  title?: string;
  rows: ListRow[];
}

export type OutboundMessage =
  | { kind: 'text'; to: string; body: string }
  | { kind: 'buttons'; to: string; body: string; buttons: ButtonSpec[] }
  | { kind: 'list'; to: string; body: string; buttonLabel: string; sections: ListSection[] }
  | { kind: 'template'; to: string; templateName: string; params: Record<string, string> }
  | {
      kind: 'flow';
      to: string;
      body: string;
      flowId: string;
      flowCta: string;
      screenId: string;
      flowActionData?: Record<string, unknown>;
    };

export interface SendResult {
  whatsappMessageId: string;
}

export interface WhatsAppClient {
  send(message: OutboundMessage): Promise<SendResult>;
}

/**
 * Real Meta WhatsApp Cloud API client. Reads credentials from environment
 * variables that, in production, are populated from Secret Manager (spec §4) —
 * unexercised until a real Firebase project + Meta app exist.
 */
export class GraphApiWhatsAppClient implements WhatsAppClient {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
    private readonly apiBaseUrl = 'https://graph.facebook.com/v20.0',
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    const body = this.toGraphPayload(message);
    const res = await fetch(`${this.apiBaseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WhatsApp send failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { messages?: { id: string }[] };
    return { whatsappMessageId: json.messages?.[0]?.id ?? randomUUID() };
  }

  private toGraphPayload(message: OutboundMessage): Record<string, unknown> {
    const base = { messaging_product: 'whatsapp', to: message.to };
    switch (message.kind) {
      case 'text':
        return { ...base, type: 'text', text: { body: message.body } };
      case 'buttons':
        return {
          ...base,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: message.body },
            action: {
              buttons: message.buttons.map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        };
      case 'list':
        return {
          ...base,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: message.body },
            action: {
              button: message.buttonLabel,
              sections: message.sections.map((s) => ({
                title: s.title,
                rows: s.rows.map((r) => ({ id: r.id, title: r.title, description: r.description })),
              })),
            },
          },
        };
      case 'template':
        return {
          ...base,
          type: 'template',
          template: {
            name: message.templateName,
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: Object.values(message.params).map((text) => ({ type: 'text', text })),
              },
            ],
          },
        };
      case 'flow':
        return {
          ...base,
          type: 'interactive',
          interactive: {
            type: 'flow',
            body: { text: message.body },
            action: {
              name: 'flow',
              parameters: {
                flow_message_version: '3',
                flow_id: message.flowId,
                flow_cta: message.flowCta,
                flow_action: 'navigate',
                flow_action_payload: {
                  screen: message.screenId,
                  data: message.flowActionData ?? {},
                },
              },
            },
          },
        };
    }
  }
}

/** Records every send in memory — used in the emulator and in tests. */
export class MockWhatsAppClient implements WhatsAppClient {
  public readonly sent: OutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<SendResult> {
    this.sent.push(message);
    return { whatsappMessageId: randomUUID() };
  }

  reset(): void {
    this.sent.length = 0;
  }
}

let sharedMock: MockWhatsAppClient | undefined;

/**
 * Picks the mock client under the Functions emulator or when explicitly
 * requested, and the real Graph API client otherwise (spec §4's Secret
 * Manager values are read here, not deeper in the codebase).
 */
export function getWhatsAppClient(): WhatsAppClient {
  const useMock = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.WHATSAPP_MOCK === 'true';
  if (useMock) {
    if (!sharedMock) sharedMock = new MockWhatsAppClient();
    return sharedMock;
  }
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN are not set. Set WHATSAPP_MOCK=true for local dev.',
    );
  }
  return new GraphApiWhatsAppClient(phoneNumberId, accessToken);
}
