// Lazy Firebase init. If VITE_FIREBASE_CONFIG is absent the app runs fully
// standalone against the local Dexie store — nothing here is required at boot.
import { initializeApp, type FirebaseApp } from 'firebase/app';

let _app: FirebaseApp | null | undefined;

function parseConfig(): Record<string, string> | null {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[firebase] VITE_FIREBASE_CONFIG is not valid JSON — running standalone.');
    return null;
  }
}

/** Returns the initialised app, or null when no config is present (offline/standalone). */
export function getFirebaseApp(): FirebaseApp | null {
  if (_app !== undefined) return _app;
  const cfg = parseConfig();
  _app = cfg ? initializeApp(cfg) : null;
  return _app;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseApp() !== null;
}
