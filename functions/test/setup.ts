import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

export const TEST_PROJECT_ID = 'next-steps-whatsapp-test';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = TEST_PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT = TEST_PROJECT_ID;
// Forces adapter/WhatsAppClient.ts to hand out the in-memory MockWhatsAppClient.
process.env.FUNCTIONS_EMULATOR = 'true';

let testEnv: RulesTestEnvironment | undefined;

async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (!testEnv) {
    testEnv = await initializeTestEnvironment({
      projectId: TEST_PROJECT_ID,
      firestore: { host: '127.0.0.1', port: 8080 },
    });
  }
  return testEnv;
}

export async function clearFirestore(): Promise<void> {
  const env = await getTestEnv();
  await env.clearFirestore();
}
