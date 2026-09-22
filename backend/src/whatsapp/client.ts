import { config } from '../config.js';
import { OutboundMessage } from './types.js';

export interface WhatsAppClient {
  sendMessage(msg: OutboundMessage): Promise<void>;
}

export class MetaWhatsAppClient implements WhatsAppClient {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string
  ) {}

  async sendMessage(msg: OutboundMessage): Promise<void> {
    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
    let payload: any;

    const toDigits = msg.to.replace(/\D/g, '');

    if (msg.kind === 'text') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'text',
        text: { body: msg.body },
      };
    } else if (msg.kind === 'buttons') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: msg.header ? { type: 'text', text: msg.header } : undefined,
          body: { text: msg.body },
          footer: msg.footer ? { text: msg.footer } : undefined,
          action: {
            buttons: msg.buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: {
                id: b.id,
                title: b.title.slice(0, 20),
              },
            })),
          },
        },
      };
    } else if (msg.kind === 'list') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: msg.header ? { type: 'text', text: msg.header } : undefined,
          body: { text: msg.body },
          footer: msg.footer ? { text: msg.footer } : undefined,
          action: {
            button: msg.buttonText.slice(0, 20),
            sections: msg.sections.map((sec) => ({
              title: sec.title.slice(0, 24),
              rows: sec.rows.map((row) => ({
                id: row.id,
                title: row.title.slice(0, 24),
                description: row.description ? row.description.slice(0, 72) : undefined,
              })),
            })),
          },
        },
      };
    } else if (msg.kind === 'flow') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: msg.header ? { type: 'text', text: msg.header } : undefined,
          body: { text: msg.body },
          footer: msg.footer ? { text: msg.footer } : undefined,
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: '3',
              flow_token: msg.flowToken || `token_${Date.now()}`,
              flow_id: msg.flowId,
              flow_cta: msg.flowCta || 'Open Form',
              flow_action: 'navigate',
              flow_action_payload: {
                screen: msg.screen || 'PRESCRIBE_SCREEN',
              },
              mode: msg.flowMode || 'draft',
            },
          },
        },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WhatsApp Client] Error sending message to ${msg.to} (${response.status}):`, errText);
      throw new Error(`WhatsApp API error ${response.status}: ${errText}`);
    }
  }
}

export class MockWhatsAppClient implements WhatsAppClient {
  public sentMessages: OutboundMessage[] = [];

  async sendMessage(msg: OutboundMessage): Promise<void> {
    this.sentMessages.push(msg);
    console.log(`[Mock WhatsApp] Sent to ${msg.to}:`, JSON.stringify(msg, null, 2));
  }

  reset(): void {
    this.sentMessages = [];
  }
}

let customClient: WhatsAppClient | null = null;

export function getWhatsAppClient(): WhatsAppClient {
  if (customClient) return customClient;

  if (config.whatsapp.phoneNumberId && config.whatsapp.accessToken) {
    return new MetaWhatsAppClient(config.whatsapp.phoneNumberId, config.whatsapp.accessToken);
  }

  return new MockWhatsAppClient();
}

export function setWhatsAppClient(client: WhatsAppClient): void {
  customClient = client;
}
