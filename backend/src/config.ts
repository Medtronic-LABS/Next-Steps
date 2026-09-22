import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nextsteps_user:nextsteps_secure_password_123@localhost:5432/nextsteps_db',
  sqliteDbPath: process.env.SQLITE_DB_PATH || './data/nextsteps.db',
  cce: {
    keycloakTokenUrl: process.env.CCE_KEYCLOAK_TOKEN_URL || 'https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token',
    clientId: process.env.CCE_CLIENT_ID || 'nextstep-emitter',
    clientSecret: process.env.CCE_CLIENT_SECRET || 'ZsFq3nfpMefiN82WteylKeLECwS3Z4sw',
    gatewayUrl: process.env.CCE_GATEWAY_URL || 'https://api.cce.mdtlabs.org/v1/events',
    sourceSystem: process.env.CCE_SOURCE_SYSTEM || 'nextsteps/rewa-district',
  },
  outbox: {
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '3000', 10),
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10),
    maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5', 10),
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'nextsteps_verify_token_2026',
    appSecret: process.env.META_APP_SECRET || '',
    appBaseUrl: process.env.NEXTSTEPS_APP_BASE_URL || 'https://nextsteps-admin.mdtlabs.org',
    testAnmPhone: process.env.TEST_ANM_PHONE || '+919812345010',
    testPhcPhone: process.env.TEST_PHC_PHONE || '+919812345020',
    testChcPhone: process.env.TEST_CHC_PHONE || '+919812345030',
    flowIdRegistration: process.env.FLOW_ID_REGISTRATION || '',
  }
};

