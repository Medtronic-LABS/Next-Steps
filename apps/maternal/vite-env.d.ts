/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Firebase web config, JSON-encoded. Absent → app runs standalone (local Dexie only). */
  readonly VITE_FIREBASE_CONFIG?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
