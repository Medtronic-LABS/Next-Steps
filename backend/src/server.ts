import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { startOutboxWorker } from './cce/outboxWorker.js';
import { syncRouter } from './routes/syncRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Mount routes
app.use('/api/sync', syncRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'next-steps-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/cce/status', (req, res) => {
  res.redirect(307, '/api/admin/status');
});

// Initialize database schema and initial seed data
console.log('[Database] Initializing Next-Steps data store...');
initDatabase();

// Start transactional outbox worker for CCE
console.log('[CCE] Starting outbox dispatcher daemon...');
startOutboxWorker();

app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Next-Steps Backend is running on port ${config.port}`);
  console.log(`🌐 Health endpoint: http://localhost:${config.port}/health`);
  console.log(`📡 CCE Gateway: ${config.cce.gatewayUrl}`);
  console.log(`🔑 Keycloak Realm: ${config.cce.keycloakTokenUrl}`);
  console.log(`====================================================`);
});
