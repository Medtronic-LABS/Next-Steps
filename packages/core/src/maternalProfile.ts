// Maternal programme profile (PRD FR-A-5.2, §10.5, ITEM-6-TEST-CASES.md
// 6c). Proves the condition-agnostic claim in ITEM-6-TEST-CASES.md's
// reframe: a maternal deployment needs different category labels and
// different default due-date intervals, never a different category set,
// a different Task.code mapping, or a different §13 formula.
//
// BR-017: labels and intervals only — no ANC schedule, no screening
// threshold, no supplementation dosage, no treatment guidance.
// unreachableThreshold and lostToFollowUpDays are left unset here, so both
// fall back to the documented defaults (TC-CFG-005) — this profile changes
// labels and intervals only.

import type { ProgrammeProfile } from './profile';

/** TC-MAT-001..004: the maternal deployment's programme profile. */
export const MATERNAL_PROFILE: ProgrammeProfile = {
  categoryLabels: {
    FOLLOW_UP_VISIT: 'ANC visit',
    LAB_INVESTIGATION: 'Anaemia screening',
    SPECIALIST_REFERRAL: 'Specialist referral',
    FOLLOW_UP_CALL: 'IFA adherence call',
    OTHER: 'Other action',
  },
  categoryDefaultDue: {
    FOLLOW_UP_VISIT: '2w',
    LAB_INVESTIGATION: '1w',
    SPECIALIST_REFERRAL: '1w',
    FOLLOW_UP_CALL: '3d',
    OTHER: '1w',
  },
  // ITEM-8-HRP-NEWBORN.md NS-1, NS-13: this deployment declares the four
  // version-1 roles — the diabetes deployment does not, and its experience
  // is unchanged.
  rolesEnabled: true,
  // NS-17: the maternal profile collects no age or gender; village, the
  // village-linked ASHA, and pregnancy status replace them. registeredAtFacilityId
  // is collected implicitly (NS-3), not through a form field.
  registrationFields: ['villageName', 'ashaName', 'pregnancyStatus', 'registeredAtFacilityId'],
};
