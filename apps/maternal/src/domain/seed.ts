// Seed data — the 8 women from the prototype. Coordination data only.
import type { RoleKey, Step, Woman } from './types';

let _n = 0;
const sid = () => 'seed' + ++_n;

type StepSeed = Partial<Step> & Pick<Step, 'cat' | 'level'>;
const mk = (o: StepSeed): Step => ({
  id: sid(),
  status: 'OPEN',
  rem: null,
  owner: 'anm' as RoleKey,
  ...o,
});

export function seedWomen(): Woman[] {
  _n = 0;
  return [
    {
      id: 'w1', name: 'Sunita Devi', hi: 'सुनीता देवी', phone: '+919812345011', village: 'Ghurehta', vhi: 'घुरेहटा', age: 29, lmp: '2026-01-08', g: 2, p: 1,
      risk: 'HRP', sc: 'Sub-centre Ghurehta', consent: true,
      steps: [
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-07-24', rem: 'delivered' }),
        mk({ cat: 'REFERRAL', level: 'CHC', sent: '2026-07-28', rem: 'delivered' }),
        mk({ cat: 'PMSMA_VISIT', level: 'PHC', due: '2026-07-09', status: 'DONE', cdate: '2026-07-09', csrc: 'AT_REFERRED_FACILITY', cby: 'PHC SN · PHC Sirmour' }),
      ],
    },
    {
      id: 'w2', name: 'Lakshmi Bai', hi: 'लक्ष्मी बाई', phone: '+919812345022', village: 'Sirmour', vhi: 'सिरमौर', age: 34, lmp: '2026-02-19', g: 3, p: 2,
      risk: 'Normal', sc: 'Sub-centre Sirmour', consent: true,
      steps: [
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-06-18', status: 'DONE', cdate: '2026-06-18', csrc: 'AT_REFERRED_FACILITY', cby: 'ANM · Sub-centre Sirmour' }),
        mk({ cat: 'REFERRAL', level: 'DH', sent: '2026-07-02', status: 'DONE', cdate: '2026-07-09', csrc: 'AT_REFERRED_FACILITY', cby: 'DH SN · DH Rewa', owner: 'anm' }),
        mk({ cat: 'LAB', level: 'DH', due: '2026-08-04', owner: 'dh_sn', rem: 'sent' }),
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-08-14' }),
      ],
    },
    {
      id: 'w3', name: 'Rekha Kumari', hi: 'रेखा कुमारी', phone: '+919812345033', village: 'Amiliya', vhi: 'अमिलिया', age: 22, lmp: '2025-12-11', g: 1, p: 0,
      risk: 'HRP', sc: 'Sub-centre Ghurehta', consent: true,
      steps: [
        mk({ cat: 'REFERRAL', level: 'TERTIARY', sent: '2026-07-20', rem: 'failed', unreach: 3 }),
        mk({ cat: 'TREATMENT', level: 'TERTIARY', due: '2026-09-02', owner: 'tert_sn' }),
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-08-06' }),
      ],
    },
    {
      id: 'w4', name: 'Gita Sharma', hi: 'गीता शर्मा', phone: '+919812345044', village: 'Ghurehta', vhi: 'घुरेहटा', age: 37, lmp: '2026-04-16', g: 4, p: 3,
      risk: 'Normal', sc: 'Sub-centre Ghurehta', consent: true,
      steps: [
        mk({ cat: 'PMSMA_VISIT', level: 'PHC', due: '2026-08-09' }),
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-08-20' }),
      ],
    },
    {
      id: 'w5', name: 'Anita Yadav', hi: 'अनीता यादव', phone: '+919812345055', village: 'Baghwar', vhi: 'बघवार', age: 26, lmp: '2026-01-22', g: 2, p: 0,
      risk: 'HRP', sc: 'Sub-centre Sirmour', consent: false,
      steps: [
        mk({ cat: 'REFERRAL', level: 'PHC', sent: '2026-07-30', status: 'DONE', cdate: '2026-08-01', csrc: 'AT_REFERRED_FACILITY', cby: 'PHC SN · PHC Sirmour' }),
        mk({ cat: 'LAB', level: 'PHC', due: '2026-08-03', owner: 'phc_sn', rem: 'failed', unreach: 2 }),
        mk({ cat: 'FOLLOW_UP', level: 'PHC', due: '2026-08-11', owner: 'phc_sn' }),
      ],
    },
    {
      id: 'w6', name: 'Meena Devi', hi: 'मीना देवी', phone: '+919812345066', village: 'Sirmour', vhi: 'सिरमौर', age: 31, lmp: '2025-11-27', g: 3, p: 1,
      risk: 'HRP', sc: 'Sub-centre Sirmour', consent: true,
      steps: [
        mk({ cat: 'REFERRAL', level: 'DH', sent: '2026-07-14', status: 'DONE', cdate: '2026-07-18', csrc: 'AT_REFERRED_FACILITY', cby: 'DH SN · DH Rewa' }),
        mk({ cat: 'TREATMENT', level: 'DH', due: '2026-08-24', owner: 'dh_sn' }),
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-08-08', rem: 'sent' }),
      ],
    },
    {
      id: 'w7', name: 'Radha Prasad', hi: 'राधा प्रसाद', phone: '+919812345077', village: 'Amiliya', vhi: 'अमिलिया', age: 24, lmp: '2026-03-19', g: 1, p: 0,
      risk: 'HRP', sc: 'Sub-centre Ghurehta', consent: true,
      steps: [
        mk({ cat: 'ANC_VISIT', level: 'SUBCENTRE', due: '2026-08-02', rem: 'delivered' }),
        mk({ cat: 'REFERRAL', level: 'CHC', sent: '2026-08-04' }),
      ],
    },
    {
      id: 'w8', name: 'Pushpa Bai', hi: 'पुष्पा बाई', phone: '+919812345088', village: 'Baghwar', vhi: 'बघवार', age: 20, lmp: '2026-05-14', g: 1, p: 0,
      risk: 'Normal', sc: 'Sub-centre Sirmour', consent: true,
      steps: [
        mk({ cat: 'PMSMA_VISIT', level: 'PHC', due: '2026-08-09' }),
        mk({ cat: 'FOLLOW_UP', level: 'CHC', due: '2026-08-18', owner: 'chc_sn' }),
      ],
    },
  ];
}
