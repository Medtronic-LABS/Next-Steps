import { defineSecret } from 'firebase-functions/params';

/**
 * Secret Manager bindings (spec §4). A function must list the secrets it
 * needs in its onRequest/onSchedule options for Firebase to inject them into
 * process.env at runtime — declaring them here and nowhere else is not
 * enough. WhatsAppClient.ts and whatsappWebhook.ts read these by name from
 * process.env, unchanged, once the binding is in place.
 */
export const whatsappPhoneNumberId = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
export const whatsappAccessToken = defineSecret('WHATSAPP_ACCESS_TOKEN');
export const metaAppSecret = defineSecret('META_APP_SECRET');
export const whatsappVerifyToken = defineSecret('WHATSAPP_VERIFY_TOKEN');
/** Admin token for the Reset Demo endpoint (addendum §14) — required header/query value, not a WhatsApp/Meta credential. */
export const resetDemoToken = defineSecret('RESET_DEMO_TOKEN');
