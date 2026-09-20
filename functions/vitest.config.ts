import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // All test files share one Firestore emulator instance and each clears
    // the whole database in beforeEach — parallel files would race each
    // other's data. Also the WhatsApp adapter factory hands out a single
    // module-level mock client (adapter/WhatsAppClient.ts), which is
    // similarly shared process-wide.
    fileParallelism: false,
  },
});
