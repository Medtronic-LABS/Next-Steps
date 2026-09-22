import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { InboundMessage, InboundMessageKind } from './types.js';
import { routeInboundMessage } from './router.js';
import { getWhatsAppClient } from './client.js';

export const whatsappRouter = Router();

/**
 * Meta Webhook Verification (GET /api/whatsapp/webhook)
 * Used by Meta when configuring the webhook URL in Meta App Dashboard.
 */
whatsappRouter.get(['/', '/webhook'], (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    console.log('[WhatsApp Webhook] Verification successful!');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Verification failed. Token mismatch.');
  return res.sendStatus(403);
});

/**
 * Inbound Meta WhatsApp Webhook (POST /webhook or /api/whatsapp/webhook)
 */
whatsappRouter.post(['/', '/webhook'], async (req: Request, res: Response) => {
  console.log('[WhatsApp Webhook POST] Received payload:', JSON.stringify(req.body));

  // Validate HMAC signature if app secret is configured
  if (config.whatsapp.appSecret) {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature) {
      const hmac = crypto.createHmac('sha256', config.whatsapp.appSecret);
      const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        console.warn('[WhatsApp Webhook] Invalid HMAC signature.');
        return res.sendStatus(403);
      }
    }
  }

  // Acknowledge receipt to Meta immediately (prevents duplicate retries)
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const msg of value.messages) {
          const inbound = parseInboundMessage(msg);
          if (!inbound) continue;

          console.log(`[WhatsApp Webhook] Inbound from ${inbound.from} (kind: ${inbound.kind}):`, inbound.text || inbound.replyId);

          const responses = await routeInboundMessage(inbound);
          const client = getWhatsAppClient();

          for (const resp of responses) {
            console.log(`[WhatsApp Webhook] Sending outbound response to ${resp.to}...`);
            await client.sendMessage(resp);
            console.log(`[WhatsApp Webhook] Outbound sent successfully to ${resp.to}`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]:', err);
  }
});

/**
 * Test Simulator Endpoint (POST /api/whatsapp/test-simulate)
 * Allows testing full WhatsApp conversation workflows without needing live Meta webhooks.
 */
whatsappRouter.post('/test-simulate', async (req: Request, res: Response) => {
  const { from, text, replyId } = req.body;

  if (!from) {
    return res.status(400).json({ success: false, error: '"from" phone number is required.' });
  }

  const kind: InboundMessageKind = replyId ? 'button_reply' : 'text';
  const inbound: InboundMessage = {
    id: `test-msg-${Date.now()}`,
    from,
    timestamp: new Date().toISOString(),
    kind,
    text,
    replyId,
  };

  try {
    const responses = await routeInboundMessage(inbound);
    res.json({
      success: true,
      inbound,
      responses,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function parseInboundMessage(raw: any): InboundMessage | null {
  if (!raw || !raw.from) return null;

  const from = raw.from;
  const id = raw.id;
  const timestamp = raw.timestamp;

  if (raw.type === 'text') {
    return {
      id,
      from,
      timestamp,
      kind: 'text',
      text: raw.text?.body || '',
      raw,
    };
  }

  if (raw.type === 'interactive') {
    const interactive = raw.interactive;
    if (interactive.type === 'button_reply') {
      return {
        id,
        from,
        timestamp,
        kind: 'button_reply',
        replyId: interactive.button_reply?.id,
        replyTitle: interactive.button_reply?.title,
        raw,
      };
    }
    if (interactive.type === 'list_reply') {
      return {
        id,
        from,
        timestamp,
        kind: 'list_reply',
        replyId: interactive.list_reply?.id,
        replyTitle: interactive.list_reply?.title,
        raw,
      };
    }
    if (interactive.type === 'nfm_reply') {
      let flowResponse: Record<string, any> = {};
      try {
        flowResponse = JSON.parse(interactive.nfm_reply?.response_json || '{}');
      } catch (e) {
        flowResponse = { raw: interactive.nfm_reply?.response_json };
      }
      return {
        id,
        from,
        timestamp,
        kind: 'flow_reply',
        flowResponse,
        raw,
      };
    }
  }

  return {
    id,
    from,
    timestamp,
    kind: 'unknown',
    raw,
  };
}
