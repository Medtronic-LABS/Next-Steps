import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ maxInstances: 10 });

export { whatsappWebhook } from './webhook/whatsappWebhook.js';
