import { getWhatsAppClient } from '../src/whatsapp/client.js';
import { promptNextStepCategories } from '../src/whatsapp/workflows/referralWorkflow.js';

async function main() {
  const client = getWhatsAppClient();
  const msg = promptNextStepCategories('+918126599673', 'w2');
  console.log('Sending message:', JSON.stringify(msg, null, 2));
  try {
    await client.sendMessage(msg);
    console.log('Successfully sent interactive message to Meta!');
  } catch (err: any) {
    console.error('Meta API Error:', err.message);
  }
}

main();
