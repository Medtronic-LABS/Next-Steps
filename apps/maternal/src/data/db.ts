// Dexie — the app reads and writes locally first (offline-first).
// Women carry their steps inline (mirrors how the UI consumes them); the outbox
// captures every mutation for idempotent replay to Firestore on reconnect.
import Dexie, { type Table } from 'dexie';
import type { DeploymentConfig, OutboxEntry, Woman } from '../domain/types';
import { VILLAGES } from '../domain/constants';
import { seedWomen } from '../domain/seed';

export interface MetaRow {
  key: string;
  value: unknown;
}

class MaternalDB extends Dexie {
  women!: Table<Woman, string>;
  config!: Table<DeploymentConfig, string>;
  outbox!: Table<OutboxEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('next-steps-maternal');
    this.version(1).stores({
      women: 'id, village, risk',
      config: 'deploymentId',
      outbox: 'id, synced, createdAt',
      meta: 'key',
    });
  }
}

export const db = new MaternalDB();

export const DEFAULT_CONFIG: DeploymentConfig = {
  deploymentId: 'pilot-rewa',
  villages: VILLAGES.map((v) => ({ name: v.name, asha: v.asha })),
  pmsmaDay: 9,
  intervals: { referralStaleDays: 7, notDoneDays: 7, overdueAlertDays: 3 },
};

/** Seed on first run. Returns the hydrated women + active config. */
export async function bootstrap(): Promise<{ women: Woman[]; config: DeploymentConfig }> {
  const count = await db.women.count();
  if (count === 0) {
    await db.transaction('rw', db.women, db.config, async () => {
      await db.women.bulkPut(seedWomen());
      await db.config.put(DEFAULT_CONFIG);
    });
  }
  const [women, config] = await Promise.all([
    db.women.toArray(),
    db.config.get(DEFAULT_CONFIG.deploymentId),
  ]);
  return { women, config: config ?? DEFAULT_CONFIG };
}

export async function persistWoman(w: Woman): Promise<void> {
  await db.women.put(w);
}

export async function enqueue(entry: OutboxEntry): Promise<void> {
  await db.outbox.put(entry);
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

/** Test/support helper — wipe everything and re-seed. */
export async function resetDb(): Promise<void> {
  await db.delete();
  await db.open();
}
