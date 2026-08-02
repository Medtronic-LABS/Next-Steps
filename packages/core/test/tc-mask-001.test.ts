import { describe, expect, it } from 'vitest';
import { maskMobile } from '../src/logic';

describe('TC-MASK-001 — FR-A-2.3 mobile masked in lists (EXPECTED FAIL)', () => {
  it('preserves each patient’s own leading digits', () => {
    expect(maskMobile('98450 12210')).toBe('98•••••210');
    expect(maskMobile('90080 12234')).toBe('90•••••234');
  });
});
