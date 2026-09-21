/**
 * Programme-configured next-step categories (prototype addendum §5/§17).
 * The core CareStep/ClosureService mechanism must work identically for any
 * category — this file is the only place that knows RCH uses "ANC" and
 * hypertension uses "REVIEW". Adding a programme means adding entries here,
 * not touching ClosureService, CareStepService, or the WhatsApp workflows.
 */

export interface StepCategoryConfig {
  id: string;
  programmeId: string;
  label: string;
  /** Facility-routed categories (referrals) get the arrival/provenance/closure machinery; others just complete. */
  requiresDestinationFacility: boolean;
  defaultDueInDays: number;
}

export const RCH_CATEGORIES: StepCategoryConfig[] = [
  { id: 'REFERRAL', programmeId: 'RCH', label: 'Referral → CHC/FRU', requiresDestinationFacility: true, defaultDueInDays: 0 },
  { id: 'ANC', programmeId: 'RCH', label: 'ANC routine contact', requiresDestinationFacility: false, defaultDueInDays: 7 },
  { id: 'PMSMA', programmeId: 'RCH', label: 'PMSMA', requiresDestinationFacility: false, defaultDueInDays: 30 },
  { id: 'DIAGNOSTIC', programmeId: 'RCH', label: 'Diagnostic', requiresDestinationFacility: false, defaultDueInDays: 3 },
];

export const HYPERTENSION_CATEGORIES: StepCategoryConfig[] = [
  { id: 'REFERRAL', programmeId: 'HYPERTENSION', label: 'Referral → CHC', requiresDestinationFacility: true, defaultDueInDays: 0 },
  { id: 'FOLLOW_UP', programmeId: 'HYPERTENSION', label: 'Follow-up', requiresDestinationFacility: false, defaultDueInDays: 14 },
  { id: 'REVIEW', programmeId: 'HYPERTENSION', label: 'Review', requiresDestinationFacility: false, defaultDueInDays: 30 },
];

const ALL_CATEGORIES = [...RCH_CATEGORIES, ...HYPERTENSION_CATEGORIES];

export function getCategoriesForProgramme(programmeId: string): StepCategoryConfig[] {
  return ALL_CATEGORIES.filter((c) => c.programmeId === programmeId);
}

export function getCategoryById(programmeId: string, categoryId: string): StepCategoryConfig | null {
  return ALL_CATEGORIES.find((c) => c.programmeId === programmeId && c.id === categoryId) ?? null;
}

/** Categories across every programme a patient belongs to, deduped by id (REFERRAL appears once even if in 2 programmes). */
export function getCategoriesForProgrammes(programmeIds: string[]): StepCategoryConfig[] {
  const seen = new Map<string, StepCategoryConfig>();
  for (const id of programmeIds) {
    for (const category of getCategoriesForProgramme(id)) {
      if (!seen.has(category.id)) seen.set(category.id, category);
    }
  }
  return [...seen.values()];
}
