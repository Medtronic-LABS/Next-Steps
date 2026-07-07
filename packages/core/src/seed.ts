// Seed clinic — the approved prototype's synthetic data. One clinic
// (Anand Diabetes Care), nine patients, ten next steps across all sections and
// statuses, plus the doctor's pre-aggregated drill and insight figures.

import type { Drill, DrillKey, Insights, Patient, WorkStep } from './types';

export const CLINIC = { name: 'Anand Diabetes Care', admin: 'Priya', doctor: 'Dr. Meera Anand' };

/** The demo "today". */
export const TODAY_LABEL = 'Monday, 6 July';

export const PATIENTS: Patient[] = [
  { id: 'p1', name: 'Ramesh Kulkarni', mobile: '98450 12210', gender: 'Male', age: 58, cid: '2043', open: 2, overdue: 1, last: '28 Jun', consent: true },
  { id: 'p2', name: 'Lakshmi Iyer', mobile: '99001 44821', gender: 'Female', age: 63, cid: '1188', open: 1, overdue: 0, last: '6 Jul', consent: true },
  { id: 'p3', name: 'Iqbal Khan', mobile: '98866 55214', gender: 'Male', age: 51, cid: '2210', open: 1, overdue: 1, last: '30 Jun', consent: true },
  { id: 'p4', name: 'Anjali Deshpande', mobile: '97400 90013', gender: 'Female', age: 52, cid: '1902', open: 1, overdue: 0, last: '2 Jul', consent: false },
  { id: 'p5', name: 'Vijay Menon', mobile: '90080 12234', gender: 'Male', age: 60, cid: '2077', open: 1, overdue: 0, last: '6 Jul', consent: true },
  { id: 'p6', name: 'Sunita Rao', mobile: '98220 33417', gender: 'Female', age: 55, cid: '1450', open: 1, overdue: 1, last: '1 Jul', consent: true },
  { id: 'p7', name: 'Fatima Sheikh', mobile: '97390 88123', gender: 'Female', age: 48, cid: '2301', open: 1, overdue: 0, last: '6 Jul', consent: true },
  { id: 'p8', name: 'Ganesh Pawar', mobile: '90192 44556', gender: 'Male', age: 62, cid: '1677', open: 1, overdue: 1, last: '2 Jul', consent: false },
  { id: 'p9', name: 'Meena Joshi', mobile: '98800 21190', gender: 'Female', age: 59, cid: '1988', open: 1, overdue: 1, last: '27 Jun', consent: true },
];

/** Avatar background|foreground pairs, cycled by patient index. */
export const AVATARS = ['#EFEDFF|#1E14BE', '#E4F7EE|#128C4A', '#ECEDFB|#6165DE', '#FBEDE4|#C35721', '#FDECEC|#994242'];

export const WORK: WorkStep[] = [
  { id: 'w1', pid: 'p1', name: 'Ramesh Kulkarni', cat: 'LAB_INVESTIGATION', detail: 'HbA1c blood test', due: '28 Jun', over: 8, priority: 'HIGH', delivery: 'Read', attempts: 0, section: 'overdue', status: 'SCHEDULED' },
  { id: 'w2', pid: 'p6', name: 'Sunita Rao', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', due: '1 Jul', over: 5, priority: 'NORMAL', delivery: 'Delivered', attempts: 0, section: 'overdue', status: 'SCHEDULED' },
  { id: 'w3', pid: 'p3', name: 'Iqbal Khan', cat: 'SPECIALIST_REFERRAL', detail: 'Nephrology referral', due: '30 Jun', over: 6, priority: 'NORMAL', delivery: 'Failed', attempts: 1, section: 'overdue', status: 'SCHEDULED' },
  { id: 'w4', pid: 'p2', name: 'Lakshmi Iyer', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', due: 'Today', over: 0, priority: 'HIGH', delivery: 'Delivered', attempts: 0, section: 'today', status: 'SCHEDULED' },
  { id: 'w5', pid: 'p5', name: 'Vijay Menon', cat: 'LAB_INVESTIGATION', detail: 'Lipid profile', due: 'Today', over: 0, priority: 'NORMAL', delivery: 'Read', attempts: 0, section: 'today', status: 'SCHEDULED' },
  { id: 'w6', pid: 'p4', name: 'Anjali Deshpande', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', due: '9 Jul', over: 0, priority: 'NORMAL', delivery: '—', attempts: 0, section: 'soon', status: 'SCHEDULED' },
  { id: 'w7', pid: 'p7', name: 'Fatima Sheikh', cat: 'SPECIALIST_REFERRAL', detail: 'Ophthalmology referral', due: '13 Jul', over: 0, priority: 'NORMAL', delivery: 'Sent', attempts: 0, section: 'soon', status: 'SCHEDULED' },
  { id: 'w8', pid: 'p8', name: 'Ganesh Pawar', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', due: '2 Jul', over: 4, priority: 'NORMAL', delivery: '—', attempts: 3, section: 'unreach', status: 'SCHEDULED' },
  { id: 'w9', pid: 'p9', name: 'Meena Joshi', cat: 'LAB_INVESTIGATION', detail: 'HbA1c blood test', due: '27 Jun', over: 9, priority: 'HIGH', delivery: 'Failed', attempts: 4, section: 'unreach', status: 'SCHEDULED' },
  { id: 'w10', pid: 'p1', name: 'Ramesh Kulkarni', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', due: '28 Jul', over: 0, priority: 'NORMAL', delivery: 'Sent', attempts: 0, section: 'future', status: 'SCHEDULED' },
];

/** Steps completed earlier today, shown at the foot of the worklist. */
export const DONE_BASE = [
  { name: 'Rahul Verma', detail: 'Follow-up visit' },
  { name: 'Prakash Nair', detail: 'Lab investigation' },
];

/** Doctor drill-downs (PRD FR-D-2). Rows reference WORK ids. */
export const DRILL: Record<DrillKey, Drill> = {
  overdue: { title: 'Overdue next steps', sub: 'Steps past their due date', rows: ['w1', 'w3', 'w2', 'w9'] },
  invest: { title: 'Investigations pending', sub: 'Lab investigations not yet done', rows: ['w1', 'w5', 'w9'] },
  referral: { title: 'Referrals pending', sub: 'Referrals not yet completed', rows: ['w3', 'w7'] },
  unreach: { title: 'Unreachable patients', sub: 'Could not reach after 3+ attempts', rows: ['w8', 'w9'] },
  lost: { title: 'Lost to follow-up', sub: 'Long overdue and unreachable', rows: ['w9', 'w8'] },
};

/** Summary-card metadata (value comes from the drill row counts). */
export const CARD_DEFS: { key: DrillKey; label: string; color: string; soft: string; iconPath: string }[] = [
  { key: 'overdue', label: 'Overdue next steps', color: '#994242', soft: '#FDECEC', iconPath: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01' },
  { key: 'invest', label: 'Investigations pending', color: '#2E9E6B', soft: '#E4F7EE', iconPath: 'M9 2h6M10 2v6.5L5.5 17a3 3 0 0 0 2.7 4.3h7.6A3 3 0 0 0 18.5 17L14 8.5V2M8 14h8' },
  { key: 'referral', label: 'Referrals pending', color: '#6165DE', soft: '#ECEDFB', iconPath: 'M4 3v6a4 4 0 0 0 8 0V3M8 15v1a5 5 0 0 0 10 0v-1M18 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z' },
  { key: 'unreach', label: 'Unreachable patients', color: '#C35721', soft: '#FBEDE4', iconPath: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92ZM2 2l20 20' },
  { key: 'lost', label: 'Lost to follow-up', color: '#909090', soft: '#F0EFEC', iconPath: 'M18 21a8 8 0 0 0-16 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 11l-3 3M19 11l3 3' },
];

export const INSIGHTS: Insights = {
  completionRate: 78,
  completionOf: '46 of 59',
  prevRate: 71,
  deltaPts: 7,
  trend: [64, 68, 71, 73, 78],
  catBars: [
    { label: 'Follow-up visits', pctLabel: '82% (28/34)', width: '82%', color: '#1E14BE' },
    { label: 'Investigations', pctLabel: '74% (17/23)', width: '74%', color: '#2E9E6B' },
    { label: 'Referrals', pctLabel: '61% (11/18)', width: '61%', color: '#6165DE' },
    { label: 'Phone calls', pctLabel: '88% (22/25)', width: '88%', color: '#C35721' },
  ],
  backlogBars: [
    { label: '1–7 d', value: 2, height: '88%', color: '#EB956A' },
    { label: '8–30 d', value: 2, height: '88%', color: '#C35721' },
    { label: '31–90 d', value: 0, height: '6%', color: '#994242' },
    { label: '90+ d', value: 0, height: '6%', color: '#751A1A' },
  ],
  referral: { rate: 61, ofLabel: '11 of 18 completed', medianDays: 11 },
  reach: { sent: 214, delivered: 205, read: 176, failed: 9, consentPct: 94 },
};
