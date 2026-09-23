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

// Deduplication cache: tracks processed message IDs for 15 minutes to ignore duplicate Meta webhook deliveries
const processedMessageIds = new Map<string, number>();
const DEDUP_TTL_MS = 15 * 60 * 1000; // 15 mins
const MAX_STALE_AGE_MS = 5 * 60 * 1000; // Discard webhook messages older than 5 minutes

function isDuplicateOrStale(msgId: string, timestamp?: string): boolean {
  const now = Date.now();

  // 1. Check stale timestamp from Meta (prevents executing hours-old or minutes-old retries)
  if (timestamp) {
    const msgEpoch = parseInt(timestamp, 10) * 1000;
    if (!isNaN(msgEpoch) && now - msgEpoch > MAX_STALE_AGE_MS) {
      console.warn(`[WhatsApp Webhook] Dropping stale message ${msgId} (age: ${Math.round((now - msgEpoch) / 1000)}s)`);
      return true;
    }
  }

  // 2. Periodic cache eviction
  if (processedMessageIds.size > 2000) {
    for (const [id, ts] of processedMessageIds.entries()) {
      if (now - ts > DEDUP_TTL_MS) {
        processedMessageIds.delete(id);
      }
    }
  }

  // 3. Deduplication check
  if (msgId) {
    if (processedMessageIds.has(msgId)) {
      console.warn(`[WhatsApp Webhook] Dropping duplicate message ${msgId} (already processed)`);
      return true;
    }
    processedMessageIds.set(msgId, now);
  }

  return false;
}

// Per-User FIFO sequential queue: prevents concurrent race conditions and ensures messages
// from the same phone number are executed strictly one after another in order.
const userQueues = new Map<string, Promise<void>>();

function enqueueUserTask(phoneNumber: string, task: () => Promise<void>): Promise<void> {
  const currentQueue = userQueues.get(phoneNumber) || Promise.resolve();
  const nextQueue = currentQueue
    .then(task, (err) => {
      console.error(`[WhatsApp Queue Error for ${phoneNumber}]:`, err);
    })
    .finally(() => {
      if (userQueues.get(phoneNumber) === nextQueue) {
        userQueues.delete(phoneNumber);
      }
    });
  userQueues.set(phoneNumber, nextQueue);
  return nextQueue;
}

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

  // Acknowledge receipt to Meta immediately (prevents duplicate HTTP retries)
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const msg of value.messages) {
          if (!msg) continue;

          // Deduplication and staleness check against Meta retries
          if (isDuplicateOrStale(msg.id, msg.timestamp)) {
            continue;
          }

          const inbound = parseInboundMessage(msg);
          if (!inbound || !inbound.from) continue;

          const senderPhone = inbound.from;

          // Serialize message processing per sender phone number strictly sequentially
          enqueueUserTask(senderPhone, async () => {
            try {
              console.log(`[WhatsApp Webhook] Inbound from ${inbound.from} (kind: ${inbound.kind}):`, inbound.text || inbound.replyId);

              const responses = await routeInboundMessage(inbound);
              const client = getWhatsAppClient();

              for (const resp of responses) {
                console.log(`[WhatsApp Webhook] Sending outbound response to ${resp.to}...`);
                await client.sendMessage(resp);
                console.log(`[WhatsApp Webhook] Outbound sent successfully to ${resp.to}`);
              }
            } catch (taskErr: any) {
              console.error(`[WhatsApp Message Processing Error for ${senderPhone}]:`, taskErr);
            }
          });
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
