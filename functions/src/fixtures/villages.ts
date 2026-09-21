/**
 * Village -> facility resolution (addendum §2): "Village should resolve the
 * linked ASHA/facility from configuration rather than requiring the worker
 * to enter these manually." Deliberately tiny/config-driven — a real
 * deployment would look this up from a facility-catchment service, not a
 * hardcoded map.
 */
import { CHC_TEONTHAR, RAMPUR_SUBCENTRE } from './seed.js';

const VILLAGE_TO_FACILITY: Record<string, string> = {
  Rampur: RAMPUR_SUBCENTRE.id,
  'Dhani Mahu': RAMPUR_SUBCENTRE.id,
  Teonthar: CHC_TEONTHAR.id,
};

const DEFAULT_FACILITY_ID = RAMPUR_SUBCENTRE.id;

export function resolveFacilityIdForVillage(village: string): string {
  return VILLAGE_TO_FACILITY[village] ?? DEFAULT_FACILITY_ID;
}
