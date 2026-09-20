import { randomUUID } from 'node:crypto';
import { routeInboundMessage } from '../../src/workflows/router.js';
import { getWhatsAppClient, MockWhatsAppClient, type OutboundMessage } from '../../src/adapter/WhatsAppClient.js';
import type { InboundMessage } from '../../src/webhook/inbound.js';

export interface TextTurn {
  kind: 'text';
  from: string;
  text: string;
}

export interface ReplyTurn {
  kind: 'reply';
  from: string;
  /** Matches the title of a button/list row in the most recent outbound message to `from`. */
  replyTitle: string;
}

export type Turn = TextTurn | ReplyTurn;

/**
 * Golden conversation replay harness (spec §20): drives the same
 * routeInboundMessage() entry point the real webhook uses, resolving
 * `replyTitle` against the opaque action token WhatsApp would actually send
 * back for a tapped button/list row — this fixture never hardcodes a token.
 */
export class ConversationReplay {
  private readonly client: MockWhatsAppClient;
  private readonly lastOutboundByRecipient = new Map<string, OutboundMessage[]>();

  constructor() {
    const client = getWhatsAppClient();
    if (!(client instanceof MockWhatsAppClient)) {
      throw new Error('ConversationReplay requires FUNCTIONS_EMULATOR=true (MockWhatsAppClient).');
    }
    this.client = client;
    this.client.reset();
  }

  /**
   * Runs one turn and returns everything sent back in response. Mirrors what
   * whatsappWebhook.ts does: route the inbound message, then actually send
   * every resulting OutboundMessage through the client.
   */
  async run(turn: Turn): Promise<OutboundMessage[]> {
    const message = this.toInboundMessage(turn);
    const outbound = await routeInboundMessage(message);
    for (const out of outbound) {
      await this.client.send(out);
    }

    for (const msg of outbound) {
      const existing = this.lastOutboundByRecipient.get(msg.to) ?? [];
      this.lastOutboundByRecipient.set(msg.to, [...existing, msg]);
    }
    return outbound;
  }

  private toInboundMessage(turn: Turn): InboundMessage {
    if (turn.kind === 'text') {
      return { from: turn.from, whatsappMessageId: randomUUID(), kind: 'text', text: turn.text };
    }
    const replyId = this.findReplyId(turn.from, turn.replyTitle);
    return { from: turn.from, whatsappMessageId: randomUUID(), kind: 'interactive', replyId };
  }

  private findReplyId(from: string, title: string): string {
    const sent = this.lastOutboundByRecipient.get(from) ?? [];
    for (const msg of [...sent].reverse()) {
      if (msg.kind === 'buttons') {
        const match = msg.buttons.find((b) => b.title === title);
        if (match) return match.id;
      }
      if (msg.kind === 'list') {
        for (const section of msg.sections) {
          const match = section.rows.find((r) => r.title === title);
          if (match) return match.id;
        }
      }
    }
    throw new Error(`No prior button/list row titled "${title}" found for ${from}`);
  }
}
