import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { verifySignature } from './signatureValidation.js';
import { claimMessageId, recordMessageStatus } from './idempotency.js';
import { parseWebhookPayload } from './inbound.js';
import { routeInboundMessage } from '../workflows/router.js';
import { getWhatsAppClient } from '../adapter/WhatsAppClient.js';
import { metaAppSecret, whatsappAccessToken, whatsappPhoneNumberId, whatsappVerifyToken } from '../config/secrets.js';

/**
 * Meta webhook (spec §15): GET handles the verification challenge, POST
 * handles inbound messages, button/list replies, and message-status updates.
 */
export const whatsappWebhook = onRequest(
  { secrets: [whatsappPhoneNumberId, whatsappAccessToken, metaAppSecret, whatsappVerifyToken] },
  async (req, res) => {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && expected && token === expected) {
      res.status(200).send(String(challenge));
      return;
    }
    res.sendStatus(403);
    return;
  }

  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }

  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const signature = req.get('x-hub-signature-256');
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody || !verifySignature(rawBody, signature, appSecret)) {
      logger.warn('whatsappWebhook: signature validation failed');
      res.sendStatus(401);
      return;
    }
  } else {
    logger.warn('whatsappWebhook: META_APP_SECRET not set — skipping signature validation (dev only)');
  }

  const { messages, statuses } = parseWebhookPayload(req.body);

  for (const status of statuses) {
    await recordMessageStatus(status.whatsappMessageId, status.status);
  }

  for (const message of messages) {
    const isDuplicate = await claimMessageId(message.whatsappMessageId);
    if (isDuplicate) {
      logger.info('whatsappWebhook: duplicate message, skipping', { id: message.whatsappMessageId });
      continue;
    }

    try {
      const outbound = await routeInboundMessage(message);
      const client = getWhatsAppClient();
      for (const out of outbound) {
        await client.send(out);
      }
    } catch (err) {
      logger.error('whatsappWebhook: unhandled error processing message', err);
    }
  }

    res.sendStatus(200);
  },
);
