// Programme profile (PRD FR-A-5.2, §10.5, ITEM-6-TEST-CASES.md TC-CFG-001..005).
//
// A profile is deployment configuration, not code: category labels, category
// default due dates, the unreachable-attempts threshold and the
// lost-to-follow-up window. It never changes the five FR-A-5.1 category keys
// or the §17 Task.code mapping (TC-CFG-004), and it never reaches a §13
// formula. BR-017: labels, intervals and thresholds only — no diagnostic
// thresholds, protocols, dosages or treatment guidance.

import { META } from './catalog';
import { DEFAULT_UNREACHABLE_THRESHOLD, TASK_CODE_BY_CATEGORY } from './logic';
import type { Category, DueKey } from './types';

/** §10.5 documented default lost-to-follow-up window, absent a profile override. */
export const DEFAULT_LOST_TO_FOLLOW_UP_DAYS = 30;

/** ITEM-8-HRP-NEWBORN.md NS-8 documented default escalation window (HRP's 2 days), absent a profile override. */
export const DEFAULT_ESCALATION_WINDOW_DAYS = 2;

/**
 * Per-deployment configuration (FR-A-5.2, §10.5). Every field is optional;
 * an absent field falls back to its documented default (TC-CFG-005).
 */
export interface ProgrammeProfile {
  categoryLabels?: Partial<Record<Category, string>>;
  categoryDefaultDue?: Partial<Record<Category, DueKey>>;
  unreachableThreshold?: number;
  lostToFollowUpDays?: number;
  /** ITEM-8-HRP-NEWBORN.md NS-8: days a referral may be pending before it escalates. HRP: 2. Sick newborn: 1. Same clock code, only the value differs. */
  escalationWindowDays?: number;
  /**
   * ITEM-8-HRP-NEWBORN.md NS-1, NS-13: whether this deployment declares the
   * four version-1 data-entry roles. Gates the standalone role picker and
   * the role-scoped worklist/arrivals UI — deployment configuration, the
   * same as a category label or a due-date interval. Absent/false: no role
   * UI is shown (e.g. the diabetes deployment behaves exactly as before).
   */
  rolesEnabled?: boolean;
}

/** TC-CFG-002: a category's label under `profile`, falling back to catalog.ts's default. */
export function getCategoryLabel(category: Category, profile?: ProgrammeProfile): string {
  return profile?.categoryLabels?.[category] ?? META[category].label;
}

/** TC-CFG-001: a category's default due-date key under `profile`, falling back to catalog.ts's default. */
export function getCategoryDefaultDue(category: Category, profile?: ProgrammeProfile): DueKey {
  return profile?.categoryDefaultDue?.[category] ?? META[category].due;
}

/** TC-CFG-003, TC-CFG-005: the unreachable-attempts threshold under `profile`, falling back to the documented default of 3. */
export function getUnreachableThreshold(profile?: ProgrammeProfile): number {
  return profile?.unreachableThreshold ?? DEFAULT_UNREACHABLE_THRESHOLD;
}

/** TC-CFG-003, TC-CFG-005: the lost-to-follow-up window (days) under `profile`, falling back to the documented default of 30. */
export function getLostToFollowUpDays(profile?: ProgrammeProfile): number {
  return profile?.lostToFollowUpDays ?? DEFAULT_LOST_TO_FOLLOW_UP_DAYS;
}

/** NS-8: the escalation window (days) under `profile`, falling back to the documented default of 2 (HRP). No branch on use case — a newborn deployment simply configures 1. */
export function getEscalationWindowDays(profile?: ProgrammeProfile): number {
  return profile?.escalationWindowDays ?? DEFAULT_ESCALATION_WINDOW_DAYS;
}

/** NS-1, NS-13: whether `profile` declares the four version-1 roles, falling back to the documented default of false (no role UI). */
export function getRolesEnabled(profile?: ProgrammeProfile): boolean {
  return profile?.rolesEnabled ?? false;
}

/**
 * TC-CFG-004: a category's FHIR Task.code — identical under every profile.
 * Takes a `profile` parameter only to match the other accessors' call shape;
 * it is never consulted. A profile may relabel a category; it may never
 * change the interoperability contract.
 */
export function getCategoryTaskCode(category: Category, _profile?: ProgrammeProfile): string {
  return TASK_CODE_BY_CATEGORY[category];
}
