import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ maxInstances: 10 });

export { whatsappWebhook } from './webhook/whatsappWebhook.js';
export { overdueAlerts } from './scheduled/overdueAlerts.js';
export { dailySummaries } from './scheduled/dailySummaries.js';
export { cceOutboxConsumer } from './scheduled/cceOutboxConsumer.js';
export { resetDemo } from './admin/resetDemo.js';
