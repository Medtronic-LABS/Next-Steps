import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { getWhatsAppClient } from '../whatsapp/client.js';
import { resolveSender } from '../whatsapp/senderResolution.js';
import { handleAlerts } from '../whatsapp/workflows/alertsWorkflow.js';

/**
 * CPHC demo bridge: the demo app asks the bot to send a worker their current alerts.
 * Called from the same machine only, with a shared token. WhatsApp delivers it only inside the
 * 24-hour window after the worker last messaged the bot (no message templates are used).
 */
export const alertsRouter = Router();

function tokenOk(header: string | undefined): boolean {
  const expected = process.env.BRIDGE_TOKEN;
  if (!expected || !header) return false; // no token configured: refuse everything
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

alertsRouter.post('/push', async (req: Request, res: Response) => {
  if (!tokenOk(req.get('X-Bridge-Token'))) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const phone = typeof req.body?.phone === 'string' ? req.body.phone : '';
  const user = phone ? resolveSender(phone) : null;
  if (!user) {
    return res.status(404).json({ success: false, error: 'Unknown phone' });
  }
  try {
    await getWhatsAppClient().sendMessage(handleAlerts(user.phone, user, user.preferred_lang ?? 'hi'));
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Alert Push Error]:', err?.message);
    res.status(502).json({ success: false, error: 'Send failed' });
  }
});
