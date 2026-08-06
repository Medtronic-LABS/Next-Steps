// Loads the deployment config (villages, pmsmaDay, intervals, labels) that makes
// field wording/villages/ASHA links change without a release. Reads Firestore when
// configured; otherwise falls back to the bundled default already in Dexie.
import type { DeploymentConfig } from '../domain/types';
import { DEFAULT_CONFIG, db } from '../data/db';
import { getFirebaseApp } from './config';

export async function loadDeploymentConfig(): Promise<DeploymentConfig> {
  const app = getFirebaseApp();
  if (!app) {
    return (await db.config.get(DEFAULT_CONFIG.deploymentId)) ?? DEFAULT_CONFIG;
  }
  try {
    // Dynamic import keeps firestore out of the standalone bundle path.
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const fs = getFirestore(app);
    const snap = await getDoc(doc(fs, 'config', DEFAULT_CONFIG.deploymentId));
    if (snap.exists()) {
      const remote = snap.data() as DeploymentConfig;
      await db.config.put(remote);
      return remote;
    }
  } catch (err) {
    console.warn('[config] falling back to local config:', err);
  }
  return (await db.config.get(DEFAULT_CONFIG.deploymentId)) ?? DEFAULT_CONFIG;
}
