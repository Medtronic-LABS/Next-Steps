// ITEM-8-HRP-NEWBORN.md NS-2: deployment-configured facility list. In
// production, facility identity comes from ABDM's Health Facility Registry —
// Next Steps consumes it, it does not issue facility identifiers. For the
// pilot the list is carried locally.
//
// Referral destinations resolve against this list only (TC-ROLE-003):
// free text and unconfigured ids are rejected, not silently accepted, since
// an unresolvable destination would leave a referral untracked at every
// facility's arrival worklist.

import type { Facility, Id } from './types';

/** NS-2 demo seed. A second PHC exists so the referral dropdown presents a real choice. */
export const FACILITIES: Facility[] = [
  { id: 'SHC-RAMPUR', name: 'Rampur SHC-AAM', tier: 'SHC', isReferralDestination: true },
  { id: 'FAC-PHC-RAMPUR', name: 'Rampur PHC', tier: 'PHC', isReferralDestination: true },
  { id: 'FAC-PHC-KOTWALI', name: 'Kotwali PHC', tier: 'PHC', isReferralDestination: true },
  { id: 'FAC-DH-001', name: 'District Hospital', tier: 'DH', isReferralDestination: true },
];

export function isConfiguredFacility(id: Id): boolean {
  return FACILITIES.some((f) => f.id === id);
}

/** NS-2: the predicate raiseReferral validates `expectedAtFacilityId` against. */
export function isValidReferralDestination(id: Id): boolean {
  return FACILITIES.some((f) => f.id === id && f.isReferralDestination);
}
