import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';

describe('TC-FILTER-001 — FR-A-6.2 category filters', () => {
  it('filters each section to LAB_INVESTIGATION without reordering', async () => {
    const engine = new InMemoryCoordinationEngine();
    const unfiltered = await engine.sections('all');
    const filtered = await engine.sections('LAB_INVESTIGATION');

    expect(filtered.overdue.map((s) => s.name)).toEqual(['Ramesh Kulkarni']);
    expect(filtered.today.map((s) => s.name)).toEqual(['Vijay Menon']);
    expect(filtered.unreach.map((s) => s.name)).toEqual(['Meena Joshi']);

    const sections = ['overdue', 'today', 'soon', 'unreach', 'upcoming'] as const;
    for (const section of sections) {
      const expectedOrder = unfiltered[section].filter((s) => s.cat === 'LAB_INVESTIGATION').map((s) => s.id);
      expect(filtered[section].map((s) => s.id)).toEqual(expectedOrder);
    }
  });
});
