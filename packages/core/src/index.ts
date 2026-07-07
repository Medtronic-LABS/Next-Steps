export * from './types';
export * from './catalog';
export * from './logic';
export * from './engine';
export {
  CLINIC,
  TODAY_LABEL,
  PATIENTS,
  WORK,
  DRILL,
  INSIGHTS,
  DONE_BASE,
  AVATARS,
} from './seed';
export { InMemoryCoordinationEngine } from './inMemoryEngine';

import type { CoordinationEngine } from './engine';
import { InMemoryCoordinationEngine } from './inMemoryEngine';

let engine: CoordinationEngine | null = null;

/** The shared CCE singleton. Swap the constructor here to use a real backend. */
export function getEngine(): CoordinationEngine {
  if (!engine) engine = new InMemoryCoordinationEngine();
  return engine;
}
