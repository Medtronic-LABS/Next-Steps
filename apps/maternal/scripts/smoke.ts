// Runtime smoke test of the ported domain logic against the seed data.
// Run with: npx tsx scripts/smoke.ts
import { seedWomen } from '../src/domain/seed';
import { worklistVM, alertsVM, stepVM, weeks, edd } from '../src/domain/logic';
import type { RoleKey } from '../src/domain/types';

const women = seedWomen();
let failures = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

// Seed integrity
check('8 women seeded', women.length === 8);
const totalSteps = women.reduce((n, w) => n + w.steps.length, 0);
check('steps present', totalSteps > 0, `${totalSteps} steps`);

// Gestation / EDD compute
const w1 = women[0];
check('w1 gestation computed', weeks(w1) !== null, `${weeks(w1)} wks`);
check('w1 EDD computed', !!edd(w1));

// stepVM overdue labelling (w3 has an ANC due 2026-08-06 = today)
const w3 = women[2];
const ancToday = w3.steps.find((s) => s.cat === 'ANC_VISIT');
check('due-today step labelled', !!ancToday && stepVM(ancToday, w3).dueLabel === 'Due today');

// Worklist for ANM shows sections
const anmSections = worklistVM(women, 'anm' as RoleKey, 'ALL', 'ALL');
check('ANM worklist has sections', anmSections.length > 0, `${anmSections.length} groups`);
const groupTitles = anmSections.map((s) => s.title).join(', ');
console.log('  ANM groups:', groupTitles);

// Alerts fire for stale referrals / unreachable (w3 has a failed referral to TERTIARY sent 2026-07-20)
const tertAlerts = alertsVM(women, 'tert_sn' as RoleKey, {});
check('tertiary sees ≥1 alert', tertAlerts.length >= 1, `${tertAlerts.length} alerts`);
tertAlerts.forEach((a) => console.log('  alert:', a.typeLabel, '·', a.womanName));

// Role filtering: PHC nurse only sees PHC-relevant steps
const phcSections = worklistVM(women, 'phc_sn' as RoleKey, 'ALL', 'ALL');
check('PHC worklist populated', phcSections.length > 0, `${phcSections.length} groups`);

console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
