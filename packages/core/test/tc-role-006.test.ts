import { describe, expect, it } from 'vitest';
import * as core from '../src/index';
import type { Id } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-1, NS-13 (batch 8a — TC-ROLE-006).
//
// No role picker, no persisted-entry mechanism, and no list of the four
// version-1 roles exist anywhere in packages/core or apps/. This test
// hypothesizes the pure logic a standalone picker would need — a
// `resolveEntry` that yields no context for empty parameters, a
// `ROLE_OPTIONS` list, and a `persistEntryChoice`/`loadPersistedEntry`
// pair surviving a reload — and reaches all of it through optional
// chaining on a cast of the core module, so every call resolves to
// `undefined` and nothing throws at import time. The assertions are
// genuine runtime comparisons against NS-1's four roles and NS-13's
// survives-a-reload requirement, not import- or construction-time
// failures.

type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

type CoreModule = {
  resolveEntry?: (params: Record<string, string | undefined>) => RoleContext | null;
  ROLE_OPTIONS?: Role[];
  persistEntryChoice?: (context: RoleContext) => void;
  loadPersistedEntry?: () => RoleContext | null;
};

describe('TC-ROLE-006 — the picker is the standalone entry (EXPECTED FAIL)', () => {
  it('no parameters resolves to no context, i.e. the picker is shown', () => {
    const resolveEntry = (core as unknown as CoreModule).resolveEntry;
    const context = resolveEntry?.({});

    expect(
      context,
      'NS-13: opening with no parameters must resolve to no role context, so the picker is the entry screen',
    ).toBeNull();
  });

  it('offers exactly the four version-1 roles, in the order NS-1 lists them', () => {
    const roleOptions = (core as unknown as CoreModule).ROLE_OPTIONS;

    expect(
      roleOptions,
      'NS-1: the standalone picker must offer exactly ANM_CHO, PHC_SN, DH_SN, ASHA — PHC_MO is read-only and out of scope for this item',
    ).toEqual(['ANM_CHO', 'PHC_SN', 'DH_SN', 'ASHA']);
  });

  it('a selected role survives a reload, without implying it is a login', () => {
    const persistEntryChoice = (core as unknown as CoreModule).persistEntryChoice;
    const loadPersistedEntry = (core as unknown as CoreModule).loadPersistedEntry;

    const selected: RoleContext = { role: 'ASHA', scope: 'Asha One' };
    persistEntryChoice?.(selected);
    const reloaded = loadPersistedEntry?.();

    expect(
      reloaded,
      'NS-13: selecting a role from the picker must set parameters that survive a reload — losing the selection drops the user back to the picker mid-task',
    ).toEqual(selected);
  });
});
