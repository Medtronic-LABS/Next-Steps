export * from './types';
export * from './catalog';
export * from './logic';
export * from './engine';
export * from './insights';
export * from './facilities';
export * from './villages';
export * from './roles';
export { AVATARS } from './seed';

import type { CoordinationEngine } from './engine';
import type { RoleContext } from './types';
import { InMemoryCoordinationEngine } from './inMemoryEngine';
import { resolveProfileKey } from './profiles';

let engine: CoordinationEngine | null = null;

/** FR-A-5.2: `?profile=maternal` selects that deployment's profile and seed clinic; absent or unrecognised falls back to diabetes. */
function activeProfileKey(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('profile');
}

/** ITEM-8 NS-13: the entry's persisted role/scope survives a reload — falls back to an in-memory value where localStorage isn't available (SSR, tests). */
const ENTRY_STORAGE_KEY = 'next-steps-cce-entry';
let inMemoryEntry: RoleContext | null = null;

/** NS-13: called by the standalone picker on selection — sets the same parameters a host would have supplied, surviving a reload. */
export function persistEntryChoice(context: RoleContext): void {
  inMemoryEntry = context;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(context));
  }
}

/** NS-13: the previously persisted role/scope, or null if none was ever set. */
export function loadPersistedEntry(): RoleContext | null {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(ENTRY_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as RoleContext;
      } catch {
        /* fall through to the in-memory value */
      }
    }
  }
  return inMemoryEntry;
}

/** The shared CCE singleton. Swap the constructor here to use a real backend. */
export function getEngine(): CoordinationEngine {
  if (!engine) {
    engine = new InMemoryCoordinationEngine({ profileKey: resolveProfileKey(activeProfileKey()) });
  }
  return engine;
}
