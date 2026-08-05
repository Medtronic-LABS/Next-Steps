// Profile registry (PRD FR-A-5.2, §10.5, ITEM-6-TEST-CASES.md 6c). The one
// place a profile key resolves to both its programme profile and its seed
// clinic — apps never see maternalProfile.ts, maternalSeed.ts or seed.ts
// directly, only a key threaded through the CoordinationEngine boundary.

import { CLINIC, PATIENTS, SEED_VISITS, WORK } from './seed';
import { MATERNAL_CLINIC, MATERNAL_PATIENTS, MATERNAL_VISITS, MATERNAL_WORK } from './maternalSeed';
import { MATERNAL_PROFILE } from './maternalProfile';
import type { ProgrammeProfile } from './profile';
import type { Clinic, Patient, Visit, WorkStep } from './types';

export type ProfileKey = 'diabetes' | 'maternal';

/** The profile a deployment gets absent an explicit, recognised choice. */
export const DEFAULT_PROFILE_KEY: ProfileKey = 'diabetes';

export interface SeedClinic {
  clinic: Clinic;
  patients: Patient[];
  work: WorkStep[];
  visits: Visit[];
  profile?: ProgrammeProfile;
}

const REGISTRY: Record<ProfileKey, SeedClinic> = {
  diabetes: { clinic: CLINIC, patients: PATIENTS, work: WORK, visits: SEED_VISITS },
  maternal: {
    clinic: MATERNAL_CLINIC,
    patients: MATERNAL_PATIENTS,
    work: MATERNAL_WORK,
    visits: MATERNAL_VISITS,
    profile: MATERNAL_PROFILE,
  },
};

/** Falls back to `DEFAULT_PROFILE_KEY` when `raw` is absent or not a recognised key. */
export function resolveProfileKey(raw?: string | null): ProfileKey {
  return raw === 'maternal' ? 'maternal' : DEFAULT_PROFILE_KEY;
}

export function getSeedClinic(key: ProfileKey): SeedClinic {
  return REGISTRY[key];
}
