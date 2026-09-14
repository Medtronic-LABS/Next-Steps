// @ts-nocheck

export const TODAY = new Date('2026-08-06T00:00:00');
export const TODAY_ISO = '2026-08-06';
export const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const CAT = {
  REFERRAL:{label:'Referral', icon:'M5 12h13M13 6l6 6-6 6'},
  ANC_VISIT:{label:'ANC visit', icon:'M8 4h8v3H8zM6 6H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1M9 13l2 2 4-4'},
  PMSMA_VISIT:{label:'PMSMA visit', icon:'M8 2v4M16 2v4M3 9h18M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM12 13v4M10 15h4'},
  FOLLOW_UP:{label:'Follow up', icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 14 0'},
  LAB:{label:'Lab', icon:'M9 3h6M10 3v6l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3'},
  IMAGING:{label:'Ultrasound', icon:'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3 12h18'},
  TREATMENT:{label:'Follow up', icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 14 0'},
  HOME_VISIT:{label:'Home visit', icon:'M3 11l9-7 9 7M5 10v10h14V10'},
  HBNC:{label:'HBNC visit', icon:'M3 11l9-7 9 7M5 10v10h14V10M12 14a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2'},
  REF_PW:{label:'Referral · PN woman', icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 9-6.7M16 18h5M18.5 15.5L21 18l-2.5 2.5'},
  REF_NB:{label:'Referral · Newborn', icon:'M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 18a6 6 0 0 1 10-4.5M16 18h5M18.5 15.5L21 18l-2.5 2.5'},
  PNC_VISIT:{label:'PNC follow up', icon:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 21a6 6 0 0 1 12 0M18 6v6M15 9h6'},
  NB_CHECK:{label:'Newborn follow up', icon:'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 21a6 6 0 0 1 12 0M10 8h.01M14 8h.01'},
  BP_CHECK:{label:'BP check', icon:'M20 12h-3l-2 5-3-10-2 5H4'},
  SUGAR_TEST:{label:'Blood sugar test', icon:'M12 21a6 6 0 0 0 6-6c0-4-6-12-6-12S6 11 6 15a6 6 0 0 0 6 6z'},
  REFILL:{label:'Medicine refill', icon:'M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7zM8 8l8 8'},
};

export const LVL = {
  SUBCENTRE:{label:'Sub-centre', short:'SC', c:'#2E9E6B', s:'#D9F7E8', facility:'Sub-centre Ghurehta', tag:'ANM'},
  PHC:{label:'PHC', short:'PHC', c:'#6165DE', s:'#E7E7FB', facility:'PHC Sirmour', tag:'MO + SN'},
  CHC:{label:'CHC', short:'CHC', c:'#1E14BE', s:'#EFEDFF', facility:'CHC Teonthar', tag:'FRU'},
  DH:{label:'District Hospital', short:'DH', c:'#994242', s:'#F7E3E3', facility:'DH Rewa', tag:'Specialist'},
  TERTIARY:{label:'Tertiary', short:'TER', c:'#C35721', s:'#FBE7DC', facility:'Medical College, Jabalpur', tag:'Advanced'},
};
export const LADDER = ['SUBCENTRE','PHC','CHC','DH','TERTIARY'];
export const FUP = {SUBCENTRE:'AAM', PHC:'PHC', CHC:'CHC', DH:'DH', TERTIARY:'Tertiary care'};
export const AVA = ['#1E14BE','#6165DE','#994242','#C35721','#2E9E6B','#655AD0'];

export const OPTMETA = {
  REFERRAL:{label:'Referral'},
  ANC_VISIT:{label:'ANC visit'},
  PMSMA_VISIT:{label:'PMSMA visit'},
  FOLLOW_UP:{label:'Follow up'},
  LAB:{label:'Lab'},
  IMAGING:{label:'Ultrasound'},
  TREATMENT:{label:'Follow up'},
  PNC_VISIT:{label:'PNC follow up'},
  NB_CHECK:{label:'Newborn follow up'},
  HBNC:{label:'HBNC visit'},
  REF_PW:{label:'Referral · PN woman'},
  REF_NB:{label:'Referral · Newborn'},
  BP_CHECK:{label:'BP check'},
  SUGAR_TEST:{label:'Blood sugar test'},
  REFILL:{label:'Medicine refill'},
  HOME_VISIT:{label:'Home visit'},
};

export const ROLES = {
  asha:{name:'ASHA Samta', short:'ASHA Samta', facility:'Village Gharonda', accent:'#C35721', level:'SUBCENTRE',
    options:[], refUp:[], refDown:[],
    icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'},
  anm:{name:'AAM', short:'AAM', facility:'Sub-centre Ghurehta', accent:'#2E9E6B', level:'SUBCENTRE',
    options:['REFERRAL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT'], refUp:['PHC','CHC','DH','TERTIARY'], refDown:[],
    icon:'M12 2l2.4 5 5.6.5-4.3 3.7 1.4 5.5L12 19l-5.1 2.7 1.4-5.5L4 12.5 9.6 12z'},
  phc_sn:{name:'PHC Staff Nurse', short:'PHC SN', facility:'PHC Sirmour', accent:'#6165DE', level:'PHC',
    options:['REFERRAL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT','LAB','IMAGING'], refUp:['CHC','DH','TERTIARY'], refDown:['SUBCENTRE'],
    icon:'M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0'},
  chc_sn:{name:'CHC Staff Nurse', short:'CHC SN', facility:'CHC Teonthar', accent:'#1E14BE', level:'CHC',
    options:['REFERRAL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT','LAB','IMAGING'], refUp:['DH','TERTIARY'], refDown:['PHC','SUBCENTRE'],
    icon:'M12 5v14M5 12h14'},
  dh_sn:{name:'DH Staff Nurse', short:'DH SN', facility:'District Hospital, Rewa', accent:'#994242', level:'DH',
    options:['REFERRAL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT','LAB','IMAGING'], refUp:['TERTIARY'], refDown:['CHC','PHC','SUBCENTRE'],
    icon:'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3'},
  tert_sn:{name:'Tertiary Staff Nurse', short:'TER SN', facility:'Medical College, Jabalpur', accent:'#C35721', level:'TERTIARY',
    options:['REFERRAL','FOLLOW_UP','LAB','IMAGING'], refUp:[], refDown:['DH','CHC','PHC','SUBCENTRE'],
    icon:'M4 21V8l8-5 8 5v13M9 21v-6h6v6M9 12h.01M15 12h.01'},
};
ROLES.phc_mo = {name:'PHC Medical Officer', short:'PHC MO', facility:'PHC Sirmour', accent:'#655AD0', level:'PHC',
  tabs:['worklist','insights','lookup','alerts'],
  options:[], refUp:['CHC','DH','TERTIARY'], refDown:['SUBCENTRE'],
  icon:'M3 20V10l9-6 9 6v10M9 20v-6h6v6M12 7v0'};
ROLES.chc_mo = {...ROLES.phc_mo, name:'CHC Medical Officer', short:'CHC MO', facility:'CHC Teonthar', level:'CHC',
  refUp:['DH','TERTIARY'], refDown:['PHC','SUBCENTRE']};
ROLES.dh_mo = {...ROLES.phc_mo, name:'District Programme Officer', short:'DPO', facility:'District Hospital, Rewa', level:'DH',
  refUp:['TERTIARY'], refDown:['CHC','PHC','SUBCENTRE']};
ROLES.phc_nurse = {name:'PHC Nurse — all services', short:'SN', facility:'PHC Sirmour', sub:'PHC Sirmour · ANC · PNC & newborn · NCD', accent:'#1E14BE', level:'PHC',
  services:true, tabs:['home','worklist','lookup','alerts'],
  options:['REFERRAL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT','LAB','IMAGING'], refUp:['CHC','DH','TERTIARY'], refDown:['SUBCENTRE'],
  icon:'M4 7h16v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 4h6l1 3H8zM12 11v6M9 14h6'};

export const capUsers = (anmLabel, svc) => [
  {k:'asha'},
  {k:'anm', label:'AAM ('+anmLabel+')'},
  {k:'phc_sn'},
  {k:'phc_mo'},
  {k:'chc_sn'},
  {k:'chc_mo'},
  {k:'dh_sn'},
  {k:'dh_mo'},
  {k:'tert_sn'}
].map(u=>({...u, svc}));

ROLES.ins_aam = {...ROLES.phc_mo, name:'AAM (ANM)', short:'AAM', facility:'Sub-centre Ghurehta', level:'SUBCENTRE',
  refUp:['PHC','CHC','DH','TERTIARY'], refDown:[]};
ROLES.ins_asha = {...ROLES.phc_mo, name:'ASHA', short:'ASHA', facility:'Village Ghurehta', level:'SUBCENTRE',
  refUp:['PHC','CHC','DH','TERTIARY'], refDown:[]};
ROLES.ins_phc = {...ROLES.phc_mo, name:'PHC', short:'PHC', facility:'PHC Sirmour', level:'PHC'};
ROLES.ins_chc = {...ROLES.phc_mo, name:'CHC', short:'CHC', facility:'CHC Teonthar', level:'CHC',
  refUp:['DH','TERTIARY'], refDown:['PHC','SUBCENTRE']};
ROLES.ins_dh = {...ROLES.phc_mo, name:'DH', short:'DH', facility:'District Hospital, Rewa', level:'DH',
  refUp:['TERTIARY'], refDown:['CHC','PHC','SUBCENTRE']};
ROLES.ins_tert = {...ROLES.phc_mo, name:'Tertiary Care', short:'TERT', facility:'Medical College, Jabalpur', level:'TERTIARY',
  refUp:[], refDown:['DH','CHC','PHC','SUBCENTRE']};

export const INS_LOGINS = [
  {k:'ins_aam', facility:'Sub-centre Ghurehta · all services'},
  {k:'ins_asha', facility:'Village Ghurehta · all services'},
  {k:'ins_phc', facility:'PHC Sirmour · all services'},
  {k:'ins_chc', facility:'CHC Teonthar · all services'},
  {k:'ins_dh', facility:'District Hospital, Rewa · all services'},
  {k:'ins_tert', facility:'Medical College, Jabalpur · all services'},
].map(u=>({...u, screen:'insights', svc:'ANC', insights:true}));

ROLES.mc_asha = {name:'ASHA Samta', short:'ASHA', facility:'Village Gharonda', accent:'#C35721', level:'SUBCENTRE',
  coach:true, mcRole:'asha', tabs:['mcdash','coach','training','library','ask'],
  options:[], refUp:[], refDown:[],
  icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'};
ROLES.mc_anm = {name:'AAM (ANM)', short:'AAM', facility:'Sub-centre Ghurehta', accent:'#2E9E6B', level:'SUBCENTRE',
  coach:true, mcRole:'anm', tabs:['mcdash','coach','training','library','ask'],
  options:[], refUp:[], refDown:[],
  icon:'M12 2l2.4 5 5.6.5-4.3 3.7 1.4 5.5L12 19l-5.1 2.7 1.4-5.5L4 12.5 9.6 12z'};

export const MC_LOGINS = [
  {k:'mc_asha', facility:'Village Gharonda · 6 modules assigned'},
  {k:'mc_anm', facility:'Sub-centre Ghurehta · 6 modules assigned'},
].map(u=>({...u, screen:'mcdash', svc:'ANC'}));

export const FOLDERS = {
  capture:{name:'NS Capture', hi:'नेक्स्ट स्टेप्स दर्ज करें', sub:'Record & close next steps', accent:'#1E14BE',
    icon:'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
    title:'NS Capture', tagline:'Pick the care register you are working in today.',
    subs:{
      ANC:{name:'ANC', hi:'गर्भावस्था की देखफ़ाल', sub:'Pregnancy · ANC, PMSMA, referrals', accent:'#1E14BE',
        icon:'M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z',
        title:'ANC', tagline:'Antenatal care — next steps from sub-centre to tertiary.', users:capUsers('ANM','ANC')},
      PNC:{name:'PNC & Newborn', hi:'प्रसव के बाद और नवजात', sub:'Mother & baby after delivery', accent:'#2E9E6B',
        icon:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 21a6 6 0 0 1 12 0M18 6v6M15 9h6',
        title:'PNC & Newborn', tagline:'Postnatal and newborn care — mother and baby followed together.', users:capUsers('ANM','PNC')},
      NCD:{name:'NCDs', hi:'मधुमेह व रक्तचाप', sub:'Diabetes & hypertension', accent:'#C35721',
        icon:'M20 12h-3l-2 5-3-10-2 5H4',
        title:'NCDs', tagline:'Diabetes and hypertension — follow-up, refills and lab tests.', users:capUsers('CHO','NCD')},
      CANCER:{name:'Cancer', hi:'कैंसर जाँच', sub:'Screening & treatment follow-up', accent:'#994242',
        icon:'M12 3a4 4 0 0 1 4 4c2.5 0 4 1.8 4 4s-1.8 4-4 4a4 4 0 0 1-8 0c-2.2 0-4-1.8-4-4s1.5-4 4-4a4 4 0 0 1 4-4z',
        title:'Cancer', tagline:'Screening positives — confirm, treat and follow up.', users:capUsers('ANM','CANCER')},
    }},
  insights:{name:'NS Insights', hi:'रिपोर्ट और आँकड़े', sub:'Dashboard & indicators', accent:'#2E9E6B',
    icon:'M4 20V10M10 20V4M16 20v-7M22 20H2',
    title:'NS Insights', tagline:'Pick your facility. Switch between services from the top bar.',
    users:INS_LOGINS},
  coach:{name:'Microcoach', hi:'छोटे-छोटे प्रशिक्षण', sub:'Bite-size refreshers & training', accent:'#655AD0',
    icon:'M12 3l9 4.5-9 4.5L3 7.5zM7 10.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-5.5',
    title:'Microcoach', tagline:'Two minutes at a time. Refresher cards from your own data, plus state training.',
    users:MC_LOGINS}
};

export const SVC = {
  ANC:{key:'ANC', label:'ANC', full:'Antenatal care', line:'ANC visits, PMSMA, referrals',
    ac:'#1E14BE', sf:'#EFEDFF', icon:'M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z',
    options:['REFERRAL','FOLLOW_UP','ANC_VISIT','PMSMA_VISIT','LAB','IMAGING'],
    journey:'Full pregnancy journey', findTitle:'Find a pregnant woman', enrol:'Register a pregnant woman',
    regNote:'Name and mobile are required. No clinical details — ever.',
    dateLabel:'LMP (last menstrual period)', hasDate:true, flag:{HRP:'HRP', Normal:'Normal'}},
  PNC:{key:'PNC', label:'PNC & Newborn', full:'Postnatal & newborn care', line:'PNC visits, follow-up, referrals',
    ac:'#2E9E6B', sf:'#D9F7E8', icon:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 21a6 6 0 0 1 12 0M18 6v6M15 9h6',
    options:['REFERRAL','PNC_VISIT','NB_CHECK'],
    journey:'Postnatal & newborn journey', findTitle:'Find a postnatal mother', enrol:'Register a postnatal mother',
    regNote:'Mother and baby are followed together. No clinical details — ever.',
    dateLabel:'Date of delivery', hasDate:true, flag:{HRP:'Danger signs', Normal:'Both well'}},
  NCD:{key:'NCD', label:'NCD', full:'Diabetes & hypertension', line:'Follow-up, refills, lab tests',
    ac:'#C35721', sf:'#FBE7DC', icon:'M20 12h-3l-2 5-3-10-2 5H4',
    options:['REFERRAL','FOLLOW_UP','REFILL','LAB'],
    journey:'NCD care journey', findTitle:'Find an NCD client', enrol:'Register an NCD client',
    regNote:'Readings stay in the NCD register — this records only what happens next.',
    dateLabel:'', hasDate:false, flag:{HRP:'Uncontrolled', Normal:'Controlled'}},
};
SVC.CANCER = {key:'CANCER', label:'Cancer', full:'Cancer screening & care', line:'Confirmation, treatment, follow-up',
  ac:'#994242', sf:'#F6EBEB', icon:'M12 3a4 4 0 0 1 4 4c2.5 0 4 1.8 4 4s-1.8 4-4 4a4 4 0 0 1-8 0c-2.2 0-4-1.8-4-4s1.5-4 4-4a4 4 0 0 1 4-4z',
  options:['REFERRAL','FOLLOW_UP','LAB','IMAGING'],
  journey:'Cancer care journey', findTitle:'Find a screened client', enrol:'Register a screened client',
  regNote:'Screening outcome stays in the register — this records only what happens next.',
  dateLabel:'', hasDate:false, flag:{HRP:'Screen positive', Normal:'Under follow-up'}};

export const SVC_KEYS = ['ANC','PNC','NCD'];
export const DATED = ['ANC_VISIT','PNC_VISIT','NB_CHECK','BP_CHECK','SUGAR_TEST','REFILL','HOME_VISIT'];

export const INS_SCOPES = {
  ins_asha:{mul:.085, list:[{id:'all', label:'Village Ghurehta', f:1, q:1.04, villages:[]}]},
  ins_aam:{mul:.3, list:[{id:'all', label:'Sub-centre Ghurehta', f:1, q:1.02, villages:['Ghurehta','Gharonda','Semri']}]},
  ins_chc:{mul:2.6, list:[
    {id:'all', label:'All PHCs', f:1, q:1, villages:[]},
    {id:'sir', label:'PHC Sirmour', f:.38, q:1.04, villages:[]},
    {id:'bai', label:'PHC Baikunthpur', f:.34, q:.94, villages:[]},
    {id:'cha', label:'PHC Chakghat', f:.28, q:.88, villages:[]}]},
  ins_dh:{mul:.55, list:[{id:'all', label:'District Hospital, Rewa', f:1, q:1, villages:[]}]},
  ins_tert:{mul:.32, list:[{id:'all', label:'Medical College, Jabalpur', f:1, q:1, villages:[]}]},
};
export const INS_SC = [
  {id:'all', label:'All SC-HWCs', f:1, q:1, villages:[]},
  {id:'ghu', label:'Ghurehta', f:.32, q:1.06, villages:['Ghurehta','Gharonda','Semri']},
  {id:'bha', label:'Bhanpur', f:.27, q:.90, villages:['Bhanpur','Rampur Kothi']},
  {id:'dih', label:'Dihiya', f:.23, q:1.0, villages:['Dihiya','Pipra']},
  {id:'kat', label:'Katra', f:.18, q:.82, villages:['Katra','Baraon','Naugaon']},
];
export const INS_BASE = {
  registered:412, hrp:78,
  actions:[
    {key:'ref', label:'Referrals pending', n:14, color:'#C35721', soft:'#FBEDE4', sub:'Referral raised, not yet closed at the receiving facility'},
    {key:'anc', label:'ANC overdue', n:21, color:'#EB956A', soft:'#FDF0E8', sub:'Next scheduled ANC visit is past its due date'},
    {key:'pmsma', label:'PMSMA overdue', n:11, color:'#6165DE', soft:'#EFEDFF', sub:'Missed or not yet scheduled for a PMSMA session'},
    {key:'drop', label:'At risk of drop-out', n:9, color:'#994242', soft:'#F6EBEB', sub:'Pending action and could not be contacted'},
    {key:'lost', label:'Lost to follow-up', n:5, color:'#751A1A', soft:'#F4E7E7', sub:'Declined the recommended care'},
  ],
  ref:[
    {label:'Closed at recommended facility', n:31, color:'#2E9E6B'},
    {label:'Closed at a lower facility', n:11, color:'#994242'},
    {label:'Open — within due date', n:8, color:'#6165DE'},
    {label:'Unreachable or declined', n:5, color:'#909090'},
  ],
  lowerDen:55,
  lowerMix:[{label:'PHC in place of CHC', n:5},{label:'PHC in place of DH', n:3},{label:'CHC in place of DH', n:2},{label:'CHC in place of Tert.', n:1}],
  anc:[{label:'1 ANC by 12 weeks', num:68, den:74},{label:'2 ANC by 26 weeks', num:49, den:61},{label:'3 ANC by 36 weeks', num:27, den:38},{label:'4 ANC by 40 weeks', num:15, den:24}],
  pmsma:[{label:'1 PMSMA by 26 weeks', num:44, den:61},{label:'4 PMSMA by 40 weeks', num:9, den:24}],
  track:{num:62, den:78},
  diag:[{label:'HRPs with labs completed', num:58, den:72},{label:'HRPs with USG completed', num:41, den:63}],
};
export const INS_SVC = {
  ANC:{registered:412, hrp:78, metric:'HRP share of registrations', cohort:'HRPs', unit:'PW',
    denLine:(h,r)=>h+' high-risk of '+r+' registered pregnant women',
    metricFac:'HRP share of women seen here', denLineFac:(h,r)=>h+' high-risk of '+r+' women with a next step created, pending or provided at this facility',
    refTitle:'HRPs by referral closure', trackLine:'responded to follow-up or completed the recommended journey',
    actions:[
      {key:'ref', label:'Referrals pending', n:14, color:'#C35721', soft:'#FBEDE4', sub:'Referral raised, not yet closed at the receiving facility'},
      {key:'anc', label:'ANC overdue', n:21, color:'#EB956A', soft:'#FDF0E8', sub:'Next scheduled ANC visit is past its due date'},
      {key:'pmsma', label:'PMSMA overdue', n:11, color:'#6165DE', soft:'#EFEDFF', sub:'Missed or not yet scheduled for a PMSMA session'},
      {key:'drop', label:'At risk of drop-out', n:9, color:'#994242', soft:'#F6EBEB', sub:'Pending action and could not be contacted'},
      {key:'lost', label:'Lost to follow-up', n:5, color:'#751A1A', soft:'#F4E7E7', sub:'Declined the recommended care'},
    ],
    secs:[
      {title:'ANC compliance', sub:'ANC status as per schedule',
        rows:[{label:'1 ANC by 12 weeks', num:68, den:74},{label:'2 ANC by 26 weeks', num:49, den:61},{label:'3 ANC by 36 weeks', num:27, den:38},{label:'4 ANC by 40 weeks', num:15, den:24}]},
      {title:'PMSMA attendance', sub:'PMSMA attendance as per schedule',
        rows:[{label:'1 PMSMA by 26 weeks', num:44, den:61},{label:'4 PMSMA by 40 weeks', num:9, den:24}]},
      {title:'Diagnostics completion', sub:"Diagnostics completed as per doctor's advice",
        rows:[{label:'HRPs with labs completed', num:58, den:72},{label:'HRPs with USG completed', num:41, den:63}]},
    ]},
  PNC:{registered:298, hrp:54, metric:'High-risk share of mothers', cohort:'mothers', unit:'mothers',
    denLine:(h,r)=>h+' high-risk of '+r+' postnatal mothers registered',
    metricFac:'High-risk share of mothers seen here', denLineFac:(h,r)=>h+' high-risk of '+r+' mothers with a next step created, pending or provided at this facility',
    refTitle:'Mothers by referral closure', trackLine:'responded to follow-up or completed the postnatal schedule',
    actions:[
      {key:'ref', label:'Referrals pending', n:9, color:'#C35721', soft:'#FBEDE4', sub:'Mother or newborn referred, not yet closed at the receiving facility'},
      {key:'pnc', label:'PNC visits overdue', n:16, color:'#EB956A', soft:'#FDF0E8', sub:'Next scheduled postnatal visit is past its due date'},
      {key:'nb', label:'NB visits overdue', n:12, color:'#6165DE', soft:'#EFEDFF', sub:'Next scheduled newborn visit is past its due date'},
      {key:'drop', label:'At risk of drop-out', n:7, color:'#994242', soft:'#F6EBEB', sub:'Pending action and could not be contacted'},
      {key:'lost', label:'Lost to follow-up', n:4, color:'#751A1A', soft:'#F4E7E7', sub:'Declined the recommended care'},
    ],
    secs:[
      {title:'PNC compliance', sub:'Postnatal visits as per schedule',
        rows:[{label:'Visit within 24 hours', num:46, den:54},{label:'Visit by day 3', num:38, den:52},{label:'Visit by day 7', num:31, den:48},{label:'Visit by day 42', num:19, den:40}]},
      {title:'Newborn', sub:'Newborn next steps closed',
        rows:[{label:'Newborn referral closed', num:38, den:47},{label:'Newborn follow up completed', num:44, den:54}]},
      {title:'PN women', sub:'Postnatal women next steps closed',
        rows:[{label:'PN referral closed', num:33, den:41},{label:'PN follow up completed', num:47, den:54}]},
    ]},
  NCD:{registered:1240, hrp:214, metric:'Uncontrolled share of clients', cohort:'clients', unit:'clients',
    denLine:(h,r)=>h+' uncontrolled of '+r+' clients on treatment',
    metricFac:'High-need share of clients seen here', denLineFac:(h,r)=>h+' high-need of '+r+' clients with a next step created, pending or provided at this facility',
    refTitle:'Clients by referral closure', trackLine:'responded to follow-up or stayed in continuous care',
    actions:[
      {key:'ref', label:'Referrals pending', n:22, color:'#C35721', soft:'#FBEDE4', sub:'Referral raised, not yet closed at the receiving facility'},
      {key:'fup', label:'Follow-up overdue', n:41, color:'#EB956A', soft:'#FDF0E8', sub:'Next scheduled review visit is past its due date'},
      {key:'refill', label:'Refills overdue', n:34, color:'#6165DE', soft:'#EFEDFF', sub:'Medicine refill not collected on time'},
      {key:'drop', label:'At risk of drop-out', n:18, color:'#994242', soft:'#F6EBEB', sub:'Pending action and could not be contacted'},
      {key:'lost', label:'Lost to follow-up', n:11, color:'#751A1A', soft:'#F4E7E7', sub:'Declined the recommended care'},
    ],
    secs:[
      {title:'Follow-up compliance', sub:'Follow-up next steps closed as per schedule',
        rows:[{label:'Monthly follow-ups', num:161, den:214},{label:'Quarterly review visit with doctor', num:132, den:214},
              {label:'Monthly medicine refill compliance', num:141, den:214},{label:'Lab test completed as advised', num:96, den:134}]},
      {title:'Average duration taken to', sub:'Median days from next step created to closed',
        durs:[{label:'Close referrals', days:9, note:'Referral raised → closed at receiving facility'},
              {label:'Complete follow-ups', days:6, note:'Follow-up scheduled → visit recorded'},
              {label:'Get medicine refills', days:4, note:'Refill due → medicine collected'}]},
      {title:'Diagnostics completion', sub:"Lab tests completed as per doctor's advice",
        rows:[{label:'Lab test advised and completed', num:96, den:134}]},
    ]},
  CANCER:{registered:186, hrp:48, metric:'Screen-positive share', cohort:'clients', unit:'clients',
    denLine:(h,r)=>h+' screen-positive of '+r+' clients screened',
    metricFac:'Screen-positive share seen here', denLineFac:(h,r)=>h+' screen-positive of '+r+' clients with a next step created, pending or provided at this facility',
    refTitle:'Clients by referral closure', trackLine:'responded to follow-up or completed the diagnostic pathway',
    actions:[
      {key:'ref', label:'Referrals pending', n:13, color:'#C35721', soft:'#FBEDE4', sub:'Referred for confirmation, not yet closed at the receiving facility'},
      {key:'fup', label:'Follow up overdue', n:11, color:'#EB956A', soft:'#FDF0E8', sub:'Next scheduled follow-up visit is past its due date'},
      {key:'inv', label:'Investigations overdue', n:8, color:'#6165DE', soft:'#EFEDFF', sub:'Lab test or imaging advised but not yet completed'},
      {key:'drop', label:'At risk of drop-out', n:5, color:'#994242', soft:'#F6EBEB', sub:'Pending action and could not be contacted'},
      {key:'lost', label:'Lost to follow-up', n:3, color:'#751A1A', soft:'#F4E7E7', sub:'Declined the recommended care'},
    ],
    secs:[
      {title:'Diagnosis confirmation', sub:'Screen-positives with diagnosis confirmed',
        rows:[{label:'Oral', num:9, den:12},{label:'Breast', num:11, den:16},{label:'Cervical', num:13, den:20},{label:'Other', num:4, den:7}]},
      {title:'Follow up compliance', sub:'Follow-up next steps closed as per schedule',
        rows:[{label:'Oral', num:8, den:12},{label:'Breast', num:12, den:16},{label:'Cervical', num:14, den:20},{label:'Other', num:5, den:7}]},
      {title:'Investigation', sub:"Investigations completed as per doctor's advice",
        rows:[{label:'Lab tests completed', num:17, den:24},{label:'Imaging done', num:12, den:19}]},
      {title:'Average duration taken to', sub:'Median days from next step created to closed',
        durs:[{label:'Close referrals', days:11, note:'Referral raised → closed at receiving facility'},
              {label:'Complete follow-ups', days:7, note:'Follow-up scheduled → visit recorded'},
              {label:'Get lab tests done', days:6, note:'Lab advised → result recorded'},
              {label:'Get imaging done', days:13, note:'Imaging advised → scan recorded'}]},
    ]},
};
export const INS_PEOPLE = {
  ref:[{name:'Rekha Kumari', meta:'Amiliya · Tertiary, 9d overdue', pill:'9d', sc:'ghu'},{name:'Radha Prasad', meta:'Amiliya · CHC Teonthar, 4d overdue', pill:'4d', sc:'ghu'},{name:'Anita Yadav', meta:'Baghwar · CHC, due today', pill:'Today', sc:'bha'},{name:'Meena Devi', meta:'Sirmour · DH Rewa, 6d overdue', pill:'6d', sc:'dih'}],
  anc:[{name:'Sunita Devi', meta:'Ghurehta · 3rd ANC due at 34 wks', pill:'11d', sc:'ghu'},{name:'Pushpa Bai', meta:'Baghwar · 2nd ANC due at 24 wks', pill:'8d', sc:'bha'},{name:'Lakshmi Bai', meta:'Sirmour · 4th ANC due at 38 wks', pill:'4d', sc:'dih'},{name:'Kavita Saket', meta:'Gharonda · 2nd ANC due at 25 wks', pill:'13d', sc:'kat'}],
  pmsma:[{name:'Gita Sharma', meta:'Ghurehta · missed 9 Aug session', pill:'Missed', sc:'ghu'},{name:'Radha Prasad', meta:'Amiliya · no PMSMA at 28 wks', pill:'0 visits', sc:'ghu'},{name:'Laxmi Gupta', meta:'Semri · missed 9 Aug session', pill:'Missed', sc:'bha'}],
  drop:[{name:'Rekha Kumari', meta:'Amiliya · 3 attempts, unreachable', pill:'3 tries', sc:'ghu'},{name:'Anita Yadav', meta:'Baghwar · phone off, lab open', pill:'2 tries', sc:'bha'},{name:'Usha Pandey', meta:'Rampur Kothi · migrated, ASHA verifying', pill:'Migrated', sc:'kat'}],
  lost:[{name:'Savitri Lodhi', meta:'Dihiya · declined referral to DH', pill:'Declined', sc:'dih'},{name:'Pushpa Rajak', meta:'Naugaon · declined USG at CHC', pill:'Declined', sc:'kat'}],
};
export const INS_PEOPLE_SVC = {
  ANC: INS_PEOPLE,
  PNC:{
    ref:[{name:'Sarita Kol', meta:'Ghurehta · newborn referred to SNCU, 3d', pill:'3d', sc:'ghu'},{name:'Rani Kushwaha', meta:'Baghwar · mother referred to CHC, 2d', pill:'2d', sc:'bha'}],
    pnc:[{name:'Sunita Devi', meta:'Ghurehta · day-7 visit due', pill:'5d', sc:'ghu'},{name:'Asha Bai', meta:'Semri · day-3 visit missed', pill:'4d', sc:'bha'},{name:'Kamla Patel', meta:'Sirmour · day-42 visit due', pill:'8d', sc:'dih'}],
    hbnc:[{name:'Kamla Yadav', meta:'Ghurehta · day-14 HBNC visit missed', pill:'3d', sc:'ghu'},{name:'Anju Saket', meta:'Baghwar · day-7 HBNC visit missed', pill:'5d', sc:'bha'},{name:'Sarita Kol', meta:'Amiliya · day-21 HBNC visit due', pill:'2d', sc:'ghu'}],
    nb:[{name:'Sarita Kol', meta:'Amiliya · day-7 newborn visit due', pill:'6d', sc:'ghu'},{name:'Anju Saket', meta:'Baghwar · low birth weight review missed', pill:'4d', sc:'bha'},{name:'Priya Vishwakarma', meta:'Sirmour · day-14 newborn visit due', pill:'2d', sc:'dih'}],
    drop:[{name:'Usha Pandey', meta:'Rampur Kothi · 3 attempts, unreachable', pill:'3 tries', sc:'kat'}],
    lost:[{name:'Pushpa Rajak', meta:'Naugaon · declined SNCU review', pill:'Declined', sc:'kat'}],
  },
  NCD:{
    ref:[{name:'Kavita Patel', meta:'Ghurehta · BP referral to PHC, 4d', pill:'4d', sc:'ghu'},{name:'Ram Prasad', meta:'Semri · referred to DH, 7d', pill:'7d', sc:'bha'}],
    fup:[{name:'Shanti Verma', meta:'Ghurehta · review due 3 months ago', pill:'12d', sc:'ghu'},{name:'Mohan Lal', meta:'Baghwar · BP review overdue', pill:'9d', sc:'bha'},{name:'Sita Bai', meta:'Katra · sugar review overdue', pill:'15d', sc:'kat'}],
    refill:[{name:'Ganesh Yadav', meta:'Sirmour · amlodipine refill missed', pill:'11d', sc:'dih'},{name:'Rukmini Devi', meta:'Ghurehta · metformin refill missed', pill:'6d', sc:'ghu'}],
    drop:[{name:'Suresh Kumar', meta:'Naugaon · phone off, 3 attempts', pill:'3 tries', sc:'kat'}],
    lost:[{name:'Bhagwan Das', meta:'Dihiya · declined further care', pill:'Declined', sc:'dih'}],
  },
  CANCER:{
    ref:[{name:'Meena Devi', meta:'Ghurehta · breast lump, referred to DH', pill:'5d', sc:'ghu'},{name:'Laxmi Gupta', meta:'Semri · cervical VIA+, referred to CHC', pill:'3d', sc:'bha'}],
    fup:[{name:'Radha Prasad', meta:'Amiliya · oral, follow-up at PHC overdue', pill:'9d', sc:'ghu'},{name:'Savitri Lodhi', meta:'Dihiya · follow-up at DH overdue', pill:'14d', sc:'dih'}],
    inv:[{name:'Anita Yadav', meta:'Baghwar · imaging at DH pending', pill:'7d', sc:'bha'},{name:'Sarita Gupta', meta:'Baghwar · lab test at DH pending', pill:'5d', sc:'bha'}],
    drop:[{name:'Usha Pandey', meta:'Katra · unreachable, 3 attempts', pill:'3 tries', sc:'kat'}],
    lost:[{name:'Pushpa Rajak', meta:'Naugaon · declined biopsy', pill:'Declined', sc:'kat'}],
  },
};

export const TABMETA = {
  home:{label:'Services', icon:'M4 7h6l1.6 2H20v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z'},
  insights:{label:'Insights', icon:'M4 20V10M10 20V4M16 20v-7M22 20H2'},
  lookup:{label:'Lookup', icon:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5'},
  worklist:{label:'Worklist', icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'},
  alerts:{label:'Alerts', icon:'M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0'},
  mcdash:{label:'My progress', icon:'M4 20V10M10 20V4M16 20v-7M22 20H2'},
  coach:{label:'Refresher', icon:'M12 3l9 4.5-9 4.5L3 7.5zM7 10.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-5.5'},
  training:{label:'Training', icon:'M4 5.5A2 2 0 0 1 6 4h5v16H6a2 2 0 0 1-2-2zM11 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7'},
  library:{label:'My library', icon:'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5'},
  ask:{label:'Ask', icon:'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z'},
};

// ================= MICRO-COACH =================
export const MC_SRC = {
  suman:{label:'SUMAN roadmap 2030 — updated guidelines', url:'https://nhm.gov.in/pdf/2026/Guidelines-%20MH/Suman-Roadmap-Updated-2030-11.pdf'},
  hbyc:{label:'Handbook for ASHA on HBYC — English', url:'https://nhm.gov.in/New-Update-2022-24/CH-Programmes/HBNC-&-HBYC-Resource-%20Material/Handbook_for_ASHA_on_HBYC-English.pdf'},
  ncd:{label:'ASHA NCD Module — NHSRC', url:'https://nhsrcindia.org/sites/default/files/2021-05/ASHA%20NCD%20Module-English.pdf'},
  skills:{label:'Skills that Save Lives — ASHA Module 6', url:'https://nhsrcindia.org/sites/default/files/2021-05/Skills%20that%20Save%20Lives%20ASHA%20Module%206%20English.pdf'},
};

export const MC_LIB = [
  {id:'l1', title:'SUMAN roadmap — updated to 2030', pub:'National Health Mission · Maternal Health guidelines', tag:'Maternal health',
    ac:'#1E14BE', sf:'#EFEDFF', pages:'PDF · guideline', url:MC_SRC.suman.url,
    cover:'assets/cover-suman.png'},
  {id:'l2', title:'Handbook for ASHA on HBYC', pub:'National Health Mission · HBNC & HBYC resource material', tag:'Newborn & child',
    ac:'#2E9E6B', sf:'#D9F7E8', pages:'PDF · handbook', url:MC_SRC.hbyc.url,
    cover:'assets/cover-hbyc.png'},
  {id:'l3', title:'ASHA NCD module', pub:'NHSRC · 2021', tag:'NCD',
    ac:'#C35721', sf:'#FBE7DC', pages:'PDF · module', url:MC_SRC.ncd.url,
    cover:'assets/cover-ncd.png'},
  {id:'l4', title:'Skills that save lives — ASHA module 6', pub:'NHSRC · 2021', tag:'Skills',
    ac:'#994242', sf:'#F6EBEB', pages:'PDF · module', url:MC_SRC.skills.url,
    cover:'assets/cover-skills.png'},
];

export const MC_MODULES = [
  {id:'m1', track:'coach', kind:'Refresher', crit:true, title:'Visits in the 8th and 9th month',
    hi:'8वें–9वें महीने में विज़िट', cat:'High-risk pregnancy', mins:2, src:MC_SRC.suman,
    why:{asha:'2 of your 5 HRPs in their 8th month have no visit logged in 30 days.',
         anm:'4 HRPs at Sub-centre Ghurehta have no 8th-month visit logged.'},
    cards:[{h:'Visit every fortnight',
      b:['HRP, 8th–9th month: one visit every 15 days.','Ask each time: bleeding, headache, blurred vision, less baby movement, swelling.','Check the birth plan: facility, transport, money, blood donor.']}], done:false,
    quiz:[{q:'As per the updated SUMAN guidelines, how often should an ASHA visit a high-risk pregnant woman during the 8th and 9th month?',
      opts:['Weekly','Daily','Monthly','Fortnightly'], correct:3,
      key:'Fortnightly visits in the last two months help you catch danger signs early and complete birth preparedness for a safe institutional delivery.'}]},
  {id:'m2', track:'coach', kind:'Refresher', crit:false, title:'The 8-visit ANC schedule under E-PMSMA',
    hi:'8 ANC विज़िट का शेड्यूल', cat:'ANC schedule', mins:2, src:MC_SRC.suman,
    why:{asha:'You closed 3 PMSMA next steps as "not completed" last month.',
         anm:'PMSMA attendance at your AAM is 61% — 8 HRPs short of schedule.'},
    cards:[{h:'Eight contacts, not four',
      b:['4 ANC + 1 PMSMA + 3 E-PMSMA = 8 contacts.','PMSMA means a doctor sees her.','An HRP needs the doctor again and again.']}], done:false,
    quiz:[{q:'As per the updated SUMAN guidelines, how many antenatal contacts should a high-risk pregnant woman receive?',
      opts:['4 ANC','5 ANC — 4 routine + 1 PMSMA','6 ANC — 5 routine + 1 PMSMA','8 ANC — 4 routine + 1 PMSMA + 3 E-PMSMA follow-ups'], correct:3,
      key:'Three extended PMSMA visits were added so a doctor reviews her repeatedly — complications are found and managed in time.'}]},
  {id:'m3', track:'coach', kind:'Refresher', crit:true, title:'Fast breathing in a young infant',
    hi:'शिशु की तेज़ साँस', cat:'Newborn danger signs', mins:3, src:MC_SRC.hbyc,
    why:{asha:'Two newborn referrals in Gharonda were closed as "declined" last month.',
         anm:'3 newborn referrals from your sub-centre closed without a facility visit.'},
    cards:[{h:'Count breaths for one full minute',
      b:['2–12 months: 50 breaths or more is fast breathing.','Also look for chest indrawing and worsening cough.','Fast breathing + fever is never normal.']}],
    quiz:[{q:'A 3-month-old baby with fever is breathing 55 times a minute. What do you do?',
      opts:['Nothing — this is normal for a baby','Count again after an hour','Treat the fever at home and review in 2 days','Treat this as fast breathing — check for danger signs and refer'], correct:3,
      key:'Fast breathing with fever needs a danger-sign check: not able to drink or breastfeed, persistent vomiting, convulsions, lethargy or chest indrawing. Any one of these means refer urgently.'}]},
  {id:'m4', track:'coach', kind:'Refresher', crit:false, title:'Lifestyle advice for BP and sugar',
    hi:'बीपी और शुगर में जीवनशैली', cat:'NCD care', mins:2, src:MC_SRC.ncd,
    cards:[
      {h:'Food', b:['No extra salt, no daily pickle or papad.','Half the plate vegetables.','No sweets, cold drinks or fried snacks.']},
      {h:'Habits', b:['Walk 30 minutes daily.','No tobacco, no alcohol.','Take medicines daily, even when she feels well.']}],
    quiz:[{q:'A woman on BP medicines says she feels well and wants to stop the tablets. What do you tell her?',
      opts:['She can stop now','She can take them on alternate days','She can stop and only walk daily','Continue daily medicines with lifestyle changes and get her BP checked'], correct:3,
      key:'High BP has no symptoms. Medicines plus less salt, daily walking and no tobacco keep her BP controlled — stopping the tablets brings it right back up.'}]},
  {id:'t1', track:'training', kind:'Training', crit:false, title:'Pre-pregnancy care — the basics',
    hi:'गर्भधारण से पहले की देखभाल', cat:'Maternal health', mins:5, src:MC_SRC.suman, pushed:'State training cell · Sept 2026',
    cards:[
      {h:'What pre-pregnancy care is', b:['The phase before conception — care given to a woman planning a pregnancy.','It improves pregnancy preparedness through early screening and better health before conception.','It reduces high-risk pregnancies, stillbirths, congenital anomalies, low birth weight and preterm birth.']},
      {h:'Preventive', b:['Early screening for anaemia, BMI (under- or overweight) and NCDs.','Folic acid 400 mcg daily and IFA supplementation.','Family planning counselling; awareness of safe and legal abortion.','Counselling to stop tobacco, alcohol and substance use.']},
      {h:'Promotive', b:['Balanced, diverse, locally available diet.','Regular physical activity, adequate sleep, stress management.','Optimal timing of conception and pregnancy preparedness.','Mental health screening, counselling and referral.']},
      {h:'Curative', b:['Treatment of existing conditions — anaemia, NCDs, STI/RTI, hepatitis B, TB.','Nutrition rehabilitation for undernutrition and obesity.','Review and change of medicines unsafe in pregnancy.','Referral of high-risk cases to PHC, CHC or DH.']}],
    quiz:[
      {q:'Pre-pregnancy care helps in —', opts:['Fewer high-risk pregnancies','Fewer low birth weight newborns','Fewer maternal and newborn deaths','All of the above'], correct:3,
        key:'Pre-pregnancy care improves the health of women planning a pregnancy, so mother and newborn outcomes all improve together.'},
      {q:'Which components are included in pre-pregnancy care?', opts:['Preventive','Promotive','Curative','All of the above'], correct:3,
        key:'It is a holistic package — early screening and awareness, healthy lifestyle promotion, and management of existing conditions.'},
      {q:'Which of these is NOT a preventive component?', opts:['Folic acid 400 mcg and IFA','Family planning counselling','Awareness of safe and legal abortion','Treating existing diabetes'], correct:3,
        key:'Managing an existing condition such as diabetes is the curative component, not preventive.'}]},
  {id:'t2', track:'training', kind:'Training', crit:false, title:'Who delivers pre-pregnancy care',
    hi:'सेवा कौन देगा', cat:'Service delivery', mins:4, src:MC_SRC.suman, pushed:'State training cell · Sept 2026',
    cards:[
      {h:'Where screening happens', b:['ANMs screen at VHSND; CHOs screen at the AAM-SC.','Routine investigations are done at the VHSND site.','Additional or confirmatory tests are done at the AAM or PHC.']},
      {h:'The ASHA is the community interface', b:['Keep a line list of reproductive-age women planning a pregnancy.','Mobilise them to VHSND and AAM-SC for screening.','Support treatment adherence and referral completion.']},
      {h:'What the ASHA counsels on', b:['Nutrition, IFA and folic acid compliance.','Healthy lifestyle — diet, activity, no tobacco or alcohol.','Occupational and environmental risk reduction.','Birth spacing and contraceptive options.']}],
    quiz:[
      {q:'The pre-pregnancy care package is delivered by —', opts:['ANM only','CHO only','ASHA only','ASHA, ANM and CHO together'], correct:3,
        key:'ASHA, ANM and CHO work as one team to deliver every essential service, including pre-pregnancy care.'},
      {q:'Which of these is NOT an ASHA task in pre-pregnancy care?', opts:['Line listing women planning a pregnancy','Mobilising women to VHSND and AAM-SC','Counselling on birth spacing','Mobilising women for a PMSMA session'], correct:3,
        key:'PMSMA sessions are for pregnant women — advanced ANC by doctors and specialists. Pre-pregnancy mobilisation is to VHSND and AAM-SC.'}]},
  {id:'t3', track:'training', kind:'Training', crit:true, title:'Danger signs in a sick young infant',
    hi:'बीमार शिशु के ख़तरे के लक्षण', cat:'Newborn & child', mins:4, src:MC_SRC.hbyc, pushed:'State training cell · Aug 2026',
    cards:[
      {h:'The general danger signs', b:['Not able to drink or breastfeed.','Persistent vomiting.','Convulsions or fits.','Lethargic or unconscious.','Chest indrawing.']},
      {h:'Fast breathing plus a danger sign', b:['Fast breathing with any danger sign means severe pneumonia.','Give the first dose of Cotrimoxazole.','Refer the child to hospital urgently — do not wait.','Tell the family what to watch for on the way.']}],
    quiz:[
      {q:'A child with fever and fast breathing is not able to drink and seems lethargic. What do you do?',
        opts:['Give paracetamol and review tomorrow','Advise more breastfeeding','Refer next week to the PHC','Give the first dose of Cotrimoxazole and refer urgently'], correct:3,
        key:'These signs indicate severe pneumonia. The first dose of Cotrimoxazole plus urgent referral — without delay — is what saves the child.'}]},
];

export const MC_ASK = [
  {q:'Are 55 breaths per minute normal for a 3 month old baby? She has fever also.',
   hiQ:'3 महीने के बच्चे की साँस 55 प्रति मिनट है, बुख़ार भी है — क्या यह सामान्य है?',
   a:['No — this is not normal. 50 breaths a minute or more in a 2–12 month old is fast breathing.',
      'Check for other symptoms: cough getting worse, chest indrawing.',
      'Check for any general danger sign: not able to drink or breastfeed, persistent vomiting, convulsions, lethargic or unconscious, chest indrawing.'],
   hiA:['नहीं, यह सामान्य नहीं है। 2–12 महीने के बच्चे में 50 या उससे अधिक साँस प्रति मिनट तेज़ साँस मानी जाती है।',
      'अन्य लक्षण देखें — खाँसी बढ़ रही हो, छाती अंदर धँसना।',
      'ख़तरे के लक्षण देखें — दूध या पानी न पी पाना, बार-बार उल्टी, दौरे, सुस्ती या बेहोशी, छाती धँसना।'],
   src:MC_SRC.hbyc, srcNote:'HBYC handbook · sick young infant'},
  {q:'The child is not able to drink and seems lethargic. What should I do?',
   hiQ:'बच्चा कुछ पी नहीं पा रहा और सुस्त लग रहा है — क्या करूँ?',
   a:['These symptoms indicate severe pneumonia.',
      'Give the first dose of Cotrimoxazole.',
      'Refer the child to hospital urgently, without any delay.'],
   hiA:['ये लक्षण गंभीर निमोनिया के हैं।',
      'को-ट्राइमॉक्साज़ोल की पहली ख़ुराक दें।',
      'बच्चे को तुरंत अस्पताल भेजें — देरी न करें।'],
   src:MC_SRC.hbyc, srcNote:'HBYC handbook · severe pneumonia'},
  {q:'How often must I visit a high-risk pregnant woman in her 8th month?',
   hiQ:'8वें महीने में उच्च जोखिम वाली गर्भवती महिला से कितनी बार मिलना है?',
   a:['Fortnightly — once every two weeks through the 8th and 9th month.',
      'Use each visit to check danger signs and complete birth preparedness for institutional delivery.'],
   hiA:['हर पंद्रह दिन में एक बार — 8वें और 9वें महीने तक।',
      'हर विज़िट में ख़तरे के लक्षण देखें और संस्थागत प्रसव की तैयारी पूरी कराएँ।'],
   src:MC_SRC.suman, srcNote:'SUMAN roadmap 2030'},
];

export let SID = 0;
export function uid(){ return 's'+(++SID); }

export const VILLAGES = [
  {name:'Rampur Khurd', asha:'Sunita Devi'},
  {name:'Bhagwanpur', asha:'Rekha Kumari'},
  {name:'Kishanganj', asha:'Anita Devi'},
  {name:'Chandpur', asha:'Phulmani Devi'},
  {name:'Nayagaon', asha:'Kiran Devi'},
];

