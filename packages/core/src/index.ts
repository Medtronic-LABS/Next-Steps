export * from './types';
export * from './catalog';
export * from './logic';
export * from './engine';
export * from './insights';
export { AVATARS } from './seed';

import type { CoordinationEngine } from './engine';
import { InMemoryCoordinationEngine } from './inMemoryEngine';
import { resolveProfileKey } from './profiles';

let engine: CoordinationEngine | null = null;

/** FR-A-5.2: `?profile=maternal` selects that deployment's profile and seed clinic; absent or unrecognised falls back to diabetes. */
function activeProfileKey(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('profile');
}

/** The shared CCE singleton. Swap the constructor here to use a real backend. */
export function getEngine(): CoordinationEngine {
  if (!engine) {
    engine = new InMemoryCoordinationEngine({ profileKey: resolveProfileKey(activeProfileKey()) });
  }
  return engine;
}
