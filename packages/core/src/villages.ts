// ITEM-8-HRP-NEWBORN.md NS-17: deployment-configured village list, mirroring
// facilities.ts's shape. Each village carries its linked ASHA in
// configuration — selecting a village resolves the ASHA (TC-REG-002); it is
// never accepted as typed free text.

export interface VillageConfig {
  name: string;
  ashaName: string;
}

/** NS-17 maternal demo seed. */
export const VILLAGES: VillageConfig[] = [
  { name: 'Rampur Khurd', ashaName: 'Sunita Devi' },
  { name: 'Bhagwanpur', ashaName: 'Rekha Kumari' },
  { name: 'Kishanganj', ashaName: 'Anita Devi' },
  { name: 'Chandpur', ashaName: 'Phulmani Devi' },
  { name: 'Nayagaon', ashaName: 'Kiran Devi' },
];

/** NS-17: the ASHA linked to a configured village, or undefined when `villageName` matches none. */
export function resolveAshaForVillage(villageName?: string): string | undefined {
  return VILLAGES.find((v) => v.name === villageName)?.ashaName;
}
