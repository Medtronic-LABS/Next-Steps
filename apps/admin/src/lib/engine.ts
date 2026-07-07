import { useEffect, useReducer } from 'react';
import { getEngine } from '@next-steps/core';

/** The shared CCE singleton (fake in-memory engine for this build). */
export const engine = getEngine();

/** Re-render the caller whenever engine state changes. */
export function useEngineSync(): void {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => engine.subscribe(force), []);
}
