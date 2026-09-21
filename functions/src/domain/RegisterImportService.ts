/**
 * Fake OCR / register import (addendum §11) — "acceptable for extraction to
 * be simulated... label this appropriately so we don't imply the OCR
 * technology has already been validated." This returns a fixed, deterministic
 * canned result; it does not read any actual image and does not persist
 * anything (existing paper work -> extraction -> matching -> human review of
 * exceptions -> roster is the interaction being demonstrated, not OCR
 * accuracy).
 */
export interface RegisterImportResult {
  rowsFound: number;
  matched: number;
  possibleMatches: number;
  newPatients: number;
  needsReview: number;
}

export function simulateRegisterImport(): RegisterImportResult {
  return { rowsFound: 18, matched: 15, possibleMatches: 2, newPatients: 1, needsReview: 3 };
}
