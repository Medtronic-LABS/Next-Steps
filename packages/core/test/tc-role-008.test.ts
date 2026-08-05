import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

// ITEM-8-HRP-NEWBORN.md NS-1, NS-13 (batch 8a — TC-ROLE-008).
//
// Roles are deployment configuration, the same as a category label or a
// due-date interval (FR-A-5.2) — not a fact the app decides for itself.
// `rolesEnabled()` is the engine's one accessor for that configuration:
// false under the diabetes profile (today's admin/doctor experience is
// unchanged), true under the maternal profile (the standalone role picker
// and role-scoped worklist/arrivals UI are declared).

describe('TC-ROLE-008 — roles are deployment configuration', () => {
  it('the diabetes deployment does not declare the four roles', () => {
    const engine = new InMemoryCoordinationEngine({ profileKey: 'diabetes' });
    expect(
      engine.rolesEnabled(),
      'the diabetes deployment must not show the role picker or role-scoped UI',
    ).toBe(false);
  });

  it('the maternal deployment declares the four roles', () => {
    const engine = new InMemoryCoordinationEngine({ profileKey: 'maternal' });
    expect(
      engine.rolesEnabled(),
      'the maternal deployment must show the role picker and role-scoped UI',
    ).toBe(true);
  });

  it('an explicit profile with no rolesEnabled flag defaults to false', () => {
    const engine = new InMemoryCoordinationEngine({ profile: {} });
    expect(engine.rolesEnabled(), 'an absent rolesEnabled field must fall back to false, not true').toBe(false);
  });
});
