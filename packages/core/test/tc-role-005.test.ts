import { describe, expect, it } from 'vitest';
import * as core from '../src/index';
import type { Id } from '../src/types';

// ITEM-8-HRP-NEWBORN.md NS-13 (batch 8a — TC-ROLE-005).
//
// No entry-resolution function exists anywhere in packages/core: nothing
// reads a `role`/`scope`/`facility` parameter set and turns it into a role
// context. This test hypothesizes NS-13's documented shape — a
// `resolveEntry(params)` function — and calls it through optional
// chaining on a cast of the core module, so the call resolves to
// `undefined` and never throws. The assertions are genuine runtime
// comparisons against the documented mapping, not import- or
// construction-time failures.

type Role = 'ANM_CHO' | 'PHC_SN' | 'DH_SN' | 'ASHA';

interface RoleContext {
  role: Role;
  scope?: string;
  facilityId?: Id;
}

type CoreModule = {
  resolveEntry?: (params: Record<string, string | undefined>) => RoleContext | null;
};

describe('TC-ROLE-005 — role and scope arrive as parameters (EXPECTED FAIL)', () => {
  it('opens directly into role=anm with a sub-centre scope', () => {
    const resolveEntry = (core as unknown as CoreModule).resolveEntry;
    const context = resolveEntry?.({ role: 'anm', scope: 'SHC-RAMPUR' });

    expect(
      context,
      'NS-13: ?role=anm&scope=SHC-RAMPUR must resolve directly into ANM_CHO scoped to SHC-RAMPUR, with no picker shown',
    ).toEqual({ role: 'ANM_CHO', scope: 'SHC-RAMPUR' });
  });

  it('opens directly into role=phc-sn with a facility', () => {
    const resolveEntry = (core as unknown as CoreModule).resolveEntry;
    const context = resolveEntry?.({ role: 'phc-sn', facility: 'FAC-PHC-001' });

    expect(
      context,
      'NS-13: ?role=phc-sn&facility=FAC-PHC-001 must resolve directly into PHC_SN scoped to FAC-PHC-001',
    ).toEqual({ role: 'PHC_SN', facilityId: 'FAC-PHC-001' });
  });

  it('falls back to the picker, not a default role, on an unrecognised role', () => {
    const resolveEntry = (core as unknown as CoreModule).resolveEntry;
    const context = resolveEntry?.({ role: 'district-supervisor', scope: 'SHC-RAMPUR' });

    expect(
      context,
      'NS-13: an unrecognised role must fall back to the picker (null), never to a default role a user was never granted',
    ).toBeNull();
  });

  it('falls back to the picker, not a default role, on an unrecognised scope', () => {
    const resolveEntry = (core as unknown as CoreModule).resolveEntry;
    const context = resolveEntry?.({ role: 'anm', scope: 'SHC-NONEXISTENT' });

    expect(
      context,
      'NS-13: a scope the deployment has not configured must fall back to the picker (null), never to a default role',
    ).toBeNull();
  });
});
