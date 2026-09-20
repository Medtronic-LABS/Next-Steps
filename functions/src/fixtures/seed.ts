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
  phoneNumber: '+919800000001',
  synthetic: true,
};

export const SEED_PATIENTS: Patient[] = [LAKSHMI_DEVI];
