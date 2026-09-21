import type { Facility, Patient, User } from '../domain/types.js';

/**
 * Deterministic synthetic fixtures (spec §12). Frozen — golden conversation
 * tests assume these exact ids/phone numbers.
 */

export const RAMPUR_SUBCENTRE: Facility = {
  id: 'RAMPUR_SUBCENTRE',
  name: 'Rampur Sub-centre',
  tier: 'SUBCENTRE',
};

export const CHC_TEONTHAR: Facility = {
  id: 'CHC_TEONTHAR',
  name: 'CHC Teonthar',
  tier: 'CHC',
};

export const SEED_FACILITIES: Facility[] = [RAMPUR_SUBCENTRE, CHC_TEONTHAR];

export const ANITA: User = {
  id: 'ANITA',
  name: 'Anita',
  role: 'ANM',
  facilityId: RAMPUR_SUBCENTRE.id,
  phoneNumber: '+919800000101',
  status: 'ACTIVE',
};

export const PRIYA: User = {
  id: 'PRIYA',
  name: 'Priya',
  role: 'STAFF_NURSE',
  facilityId: CHC_TEONTHAR.id,
  phoneNumber: '+919800000102',
  status: 'ACTIVE',
};

export const SEED_USERS: User[] = [ANITA, PRIYA];

export const LAKSHMI_DEVI: Patient = {
  id: 'LAKSHMI_DEVI',
  displayName: 'Lakshmi Devi',
  age: 28,
  village: 'Rampur',
  phoneNumber: '+919800000001',
  rchId: null,
  programmeContexts: [{ programmeId: 'RCH', attributes: { pregnancyStatus: 'HIGH_RISK' } }],
  whatsappReminderConsent: true,
  consentTimestamp: '2026-01-01T00:00:00.000Z',
  consentCapturedByUserId: ANITA.id,
  synthetic: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * Hypertension cohort — proves condition-neutrality (addendum §17): the same
 * find/create-step/worklist/complete mechanism must work for Ramesh exactly
 * as it does for Lakshmi, without any code change beyond this fixture and
 * stepCategories.ts's HYPERTENSION_CATEGORIES.
 */
export const RAMESH_KUMAR: Patient = {
  id: 'RAMESH_KUMAR',
  displayName: 'Ramesh Kumar',
  age: 54,
  village: 'Rampur',
  phoneNumber: '+919800000002',
  rchId: null,
  programmeContexts: [{ programmeId: 'HYPERTENSION', attributes: {} }],
  whatsappReminderConsent: true,
  consentTimestamp: '2026-01-01T00:00:00.000Z',
  consentCapturedByUserId: ANITA.id,
  synthetic: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

// Kept out of the default SEED_PATIENTS — golden conversation tests assume
// exactly one patient exists (Lakshmi) so "Find a patient" auto-selects her.
// loadFixtures({ withHypertensionCohort: true }) opts Ramesh in.
export const SEED_PATIENTS: Patient[] = [LAKSHMI_DEVI];
export const HYPERTENSION_COHORT_PATIENTS: Patient[] = [RAMESH_KUMAR];
