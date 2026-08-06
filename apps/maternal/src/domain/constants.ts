// Domain constants — ported verbatim from the prototype (CAT / LVL / ROLES / …).
import type { Category, Level, RoleKey, TabKey } from './types';

export const MON = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Fixed "today" so relative dates render exactly as in the prototype. */
export const TODAY_ISO = '2026-08-06';
export const TODAY = new Date('2026-08-06T00:00:00');

export interface CatMeta {
  label: string;
  icon: string; // SVG path `d`
}

export const CAT: Record<Category, CatMeta> = {
  REFERRAL: { label: 'Referral', icon: 'M5 12h13M13 6l6 6-6 6' },
  ANC_VISIT: {
    label: 'ANC visit',
    icon: 'M8 4h8v3H8zM6 6H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1M9 13l2 2 4-4',
  },
  PMSMA_VISIT: {
    label: 'PMSMA visit',
    icon: 'M8 2v4M16 2v4M3 9h18M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM12 13v4M10 15h4',
  },
  FOLLOW_UP: {
    label: 'Follow-up with doctor',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 14 0',
  },
  LAB: { label: 'Lab', icon: 'M9 3h6M10 3v6l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3' },
  IMAGING: {
    label: 'Imaging',
    icon: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3 12h18',
  },
  TREATMENT: { label: 'Treatment', icon: 'M3 12h4l3 8 4-16 3 8h4' },
  HOME_VISIT: { label: 'Home visit', icon: 'M3 11l9-7 9 7M5 10v10h14V10' },
};

export interface LevelMeta {
  label: string;
  short: string;
  c: string;  // accent colour
  s: string;  // soft/tint background
  facility: string;
  tag: string;
}

export const LVL: Record<Level, LevelMeta> = {
  SUBCENTRE: { label: 'Sub-centre', short: 'SC', c: '#2E9E6B', s: '#D9F7E8', facility: 'Sub-centre Ghurehta', tag: 'ANM' },
  PHC: { label: 'PHC', short: 'PHC', c: '#6165DE', s: '#E7E7FB', facility: 'PHC Sirmour', tag: 'MO + SN' },
  CHC: { label: 'CHC', short: 'CHC', c: '#1E14BE', s: '#EFEDFF', facility: 'CHC Teonthar', tag: 'FRU' },
  DH: { label: 'District Hospital', short: 'DH', c: '#994242', s: '#F7E3E3', facility: 'DH Rewa', tag: 'Specialist' },
  TERTIARY: { label: 'Tertiary', short: 'TER', c: '#C35721', s: '#FBE7DC', facility: 'Medical College, Jabalpur', tag: 'Advanced' },
};

export const LADDER: Level[] = ['SUBCENTRE', 'PHC', 'CHC', 'DH', 'TERTIARY'];
export const AVA = ['#1E14BE', '#6165DE', '#994242', '#C35721', '#2E9E6B', '#655AD0'];

export const OPTMETA: Partial<Record<Category, { label: string }>> = {
  REFERRAL: { label: 'Referral' },
  ANC_VISIT: { label: 'ANC visit' },
  PMSMA_VISIT: { label: 'PMSMA visit' },
  FOLLOW_UP: { label: 'Follow-up' },
  LAB: { label: 'Lab' },
  IMAGING: { label: 'Imaging' },
  TREATMENT: { label: 'Treatment' },
};

export interface RoleMeta {
  name: string;
  short: string;
  facility: string;
  accent: string;
  level: Level;
  options: Category[];
  refUp: Level[];
  refDown: Level[];
  icon: string;
}

export const ROLES: Record<RoleKey, RoleMeta> = {
  asha: {
    name: 'ASHA Samta', short: 'ASHA Samta', facility: 'Village Gharonda', accent: '#C35721', level: 'SUBCENTRE',
    options: ['REFERRAL', 'ANC_VISIT', 'PMSMA_VISIT', 'FOLLOW_UP'], refUp: ['PHC', 'CHC', 'DH', 'TERTIARY'], refDown: [],
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  },
  anm: {
    name: 'ANM', short: 'ANM', facility: 'Sub-centre Ghurehta', accent: '#2E9E6B', level: 'SUBCENTRE',
    options: ['REFERRAL', 'ANC_VISIT', 'PMSMA_VISIT'], refUp: ['PHC', 'CHC', 'DH', 'TERTIARY'], refDown: [],
    icon: 'M12 2l2.4 5 5.6.5-4.3 3.7 1.4 5.5L12 19l-5.1 2.7 1.4-5.5L4 12.5 9.6 12z',
  },
  phc_sn: {
    name: 'PHC Staff Nurse', short: 'PHC SN', facility: 'PHC Sirmour', accent: '#6165DE', level: 'PHC',
    options: ['REFERRAL', 'FOLLOW_UP', 'LAB', 'IMAGING', 'TREATMENT', 'PMSMA_VISIT'], refUp: ['CHC', 'DH', 'TERTIARY'], refDown: ['SUBCENTRE'],
    icon: 'M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0',
  },
  chc_sn: {
    name: 'CHC Staff Nurse', short: 'CHC SN', facility: 'CHC Teonthar', accent: '#1E14BE', level: 'CHC',
    options: ['REFERRAL', 'FOLLOW_UP', 'LAB', 'IMAGING', 'TREATMENT', 'PMSMA_VISIT'], refUp: ['DH', 'TERTIARY'], refDown: ['SUBCENTRE'],
    icon: 'M12 5v14M5 12h14',
  },
  dh_sn: {
    name: 'DH Staff Nurse', short: 'DH SN', facility: 'District Hospital, Rewa', accent: '#994242', level: 'DH',
    options: ['REFERRAL', 'FOLLOW_UP', 'LAB', 'IMAGING', 'TREATMENT'], refUp: ['TERTIARY'], refDown: ['CHC', 'PHC', 'SUBCENTRE'],
    icon: 'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
  },
  tert_sn: {
    name: 'Tertiary Staff Nurse', short: 'TER SN', facility: 'Medical College, Jabalpur', accent: '#C35721', level: 'TERTIARY',
    options: ['REFERRAL', 'FOLLOW_UP', 'LAB', 'IMAGING', 'TREATMENT'], refUp: [], refDown: ['DH', 'CHC', 'PHC', 'SUBCENTRE'],
    icon: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6M9 12h.01M15 12h.01',
  },
};

export const ROLE_ORDER: RoleKey[] = ['anm', 'phc_sn', 'chc_sn', 'dh_sn', 'tert_sn', 'asha'];

export const TABMETA: Record<TabKey, { label: string; icon: string }> = {
  lookup: { label: 'Lookup', icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5' },
  worklist: { label: 'Worklist', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  alerts: { label: 'Alerts', icon: 'M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0' },
};

/** Villages used at registration; each carries its linked ASHA (NS-8). */
export const VILLAGES = [
  { name: 'Rampur Khurd', asha: 'Sunita Devi' },
  { name: 'Bhagwanpur', asha: 'Rekha Kumari' },
  { name: 'Kishanganj', asha: 'Anita Devi' },
  { name: 'Chandpur', asha: 'Phulmani Devi' },
  { name: 'Nayagaon', asha: 'Kiran Devi' },
];

export const TINT: Record<string, string> = {
  '#1E14BE': '#EFEDFF',
  '#6165DE': '#E7E7FB',
  '#2E9E6B': '#D9F7E8',
  '#994242': '#F7E3E3',
  '#C35721': '#FBE7DC',
};
