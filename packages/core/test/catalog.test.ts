import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, DUE, META } from '../src/catalog';

describe('TC-CAT-001 — FR-A-5.2 category due-date defaults', () => {
  it('defaults exactly to the PRD due-date label for each category', () => {
    expect(DUE[META.FOLLOW_UP_VISIT.due].label).toBe('1 month');
    expect(DUE[META.LAB_INVESTIGATION.due].label).toBe('1 week');
    expect(DUE[META.SPECIALIST_REFERRAL.due].label).toBe('2 weeks');
    expect(DUE[META.FOLLOW_UP_CALL.due].label).toBe('3 days');
    expect(DUE[META.OTHER.due].label).toBe('1 week');
  });
});

describe('TC-CAT-002 — FR-A-5.1, BR-017 five categories, no more', () => {
  it('enumerates exactly five category keys', () => {
    expect(CATEGORY_ORDER).toEqual([
      'FOLLOW_UP_VISIT',
      'LAB_INVESTIGATION',
      'SPECIALIST_REFERRAL',
      'FOLLOW_UP_CALL',
      'OTHER',
    ]);
    expect(Object.keys(META).sort()).toEqual([...CATEGORY_ORDER].sort());
  });

  it('contains no clinical term in any category label', () => {
    const clinicalTerms = /diagnosis|prescription|result|vitals/i;
    for (const cat of CATEGORY_ORDER) {
      expect(META[cat].label).not.toMatch(clinicalTerms);
    }
  });
});
