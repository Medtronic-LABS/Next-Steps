import { useEffect, useReducer, useState } from 'react';
import { getEngine } from '@next-steps/core';

/** The shared CCE singleton (fake in-memory engine for this build). */
export const engine = getEngine();

/** Re-render the caller whenever engine state changes. */
export function useEngineSync(): void {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => engine.subscribe(force), []);
}

/**
 * Read engine data. Re-runs `read` whenever `deps` changes or the engine
 * notifies via subscribe. Discards a response if a newer request has since
 * started (e.g. `deps` changed again before the first resolved).
 */
export function useEngineData<T>(read: () => Promise<T>, deps: unknown[]): { data: T | undefined; error: Error | null } {
  const [tick, bump] = useReducer((x: number) => x + 1, 0);
  const [state, setState] = useState<{ data: T | undefined; error: Error | null }>({ data: undefined, error: null });

  useEffect(() => engine.subscribe(bump), []);

  useEffect(() => {
    let stale = false;
    read().then(
      (data) => { if (!stale) setState({ data, error: null }); },
      (error) => { if (!stale) setState({ data: undefined, error }); },
    );
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return state;
}
