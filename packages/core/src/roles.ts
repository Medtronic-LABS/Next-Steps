// ITEM-8-HRP-NEWBORN.md NS-1, NS-13: role/scope resolution, framework-free.
//
// Role and scope are inputs — supplied by a host application's URL
// parameters, or set by the standalone picker — never something the product
// decides. An unrecognised role or scope must fall back to the picker
// (`null`), never to a default role a user was never granted (TC-ROLE-005).

import { FACILITIES } from './facilities';
import type { Role, RoleContext } from './types';

/** NS-1: the four version-1 data-entry roles, in the order the picker offers them. */
export const ROLE_OPTIONS: Role[] = ['ANM_CHO', 'PHC_SN', 'DH_SN', 'ASHA'];

const ROLE_PARAM_TO_ROLE: Record<string, Role> = {
  anm: 'ANM_CHO',
  anm_cho: 'ANM_CHO',
  'phc-sn': 'PHC_SN',
  phc_sn: 'PHC_SN',
  'dh-sn': 'DH_SN',
  dh_sn: 'DH_SN',
  asha: 'ASHA',
};

const FACILITY_SCOPED: ReadonlySet<Role> = new Set(['PHC_SN', 'DH_SN']);

/**
 * NS-13: `?role=anm&scope=SHC-RAMPUR`, `?role=phc-sn&facility=FAC-PHC-001`.
 * ANM_CHO's scope must be a configured sub-centre (NS-2) — it is deployment
 * configuration, unlike an ASHA's scope, which is her dynamic patient link
 * and has no fixed list to validate against. A facility-scoped role's
 * facility id is trusted from the host, the way it would arrive from an
 * authenticated session in production.
 */
export function resolveEntry(params: Record<string, string | undefined>): RoleContext | null {
  const rawRole = params.role;
  if (!rawRole) return null;
  const role = ROLE_PARAM_TO_ROLE[rawRole.toLowerCase()];
  if (!role) return null;

  if (FACILITY_SCOPED.has(role)) {
    const facilityId = params.facility;
    if (!facilityId) return null;
    return { role, facilityId };
  }

  const scope = params.scope;
  if (!scope) return null;
  if (role === 'ANM_CHO' && !FACILITIES.some((f) => f.id === scope)) return null;
  return { role, scope };
}
