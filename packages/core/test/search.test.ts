import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

describe('TC-SEARCH-002 — FR-A-2.2 name search is token-prefix, case-insensitive', () => {
  it('matches "iye", "IYE" and "lak" to Lakshmi Iyer only', async () => {
    for (const query of ['iye', 'IYE', 'lak']) {
      const engine = new InMemoryCoordinationEngine();
      const result = await engine.searchPatients(query);
      expect(result.map((p) => p.name)).toEqual(['Lakshmi Iyer']);
    }
  });

  it('returns nothing for "yer" — substring matching is not applied', async () => {
    const engine = new InMemoryCoordinationEngine();
    const result = await engine.searchPatients('yer');
    expect(result).toEqual([]);
  });
});
