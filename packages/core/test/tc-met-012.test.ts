import { describe, expect, it } from 'vitest';
import { formatRateWithDenominator } from '../src/logic';

// §13 — "Percentages display with denominators (e.g. '78% (46 of 59)') so
// small numbers are never misleading." `formatRateWithDenominator` does
// not exist yet, so this import is expected to fail.

describe('TC-MET-012 — §13 percentages carry their denominators (EXPECTED FAIL)', () => {
  it('2 of 4 formats as "50% (2 of 4)"', () => {
    expect(formatRateWithDenominator(2, 4)).toBe('50% (2 of 4)');
  });
});
