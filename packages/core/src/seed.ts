// Seed clinic — the approved prototype's synthetic data. One clinic
// (Anand Diabetes Care), nine patients, ten next steps across all sections and
// statuses, plus the doctor's pre-aggregated drill and insight figures.

import type { Drill, DrillKey, Insights, Patient, Visit, WorkStep } from './types';

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

const SEED_DAY_MS = 24 * 60 * 60 * 1000;

/** Seed due dates are offsets from load time, not absolute dates, so the demo never goes stale (see ITEM-3-TEST-CASES.md TC-SEED-001). */
function daysFromNow(offset: number): Date {
  return new Date(Date.now() + offset * SEED_DAY_MS);
}

export const WORK: WorkStep[] = [
  { id: 'w1', pid: 'p1', visitId: 'v1', name: 'Ramesh Kulkarni', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-8), priority: 'HIGH', delivery: 'Read', attempts: 0, status: 'SCHEDULED' },
  { id: 'w2', pid: 'p6', visitId: 'v2', name: 'Sunita Rao', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(-5), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'SCHEDULED' },
  { id: 'w3', pid: 'p3', visitId: 'v3', name: 'Iqbal Khan', cat: 'SPECIALIST_REFERRAL', detail: '', dueDate: daysFromNow(-6), priority: 'NORMAL', delivery: 'Failed', attempts: 1, status: 'SCHEDULED' },
  { id: 'w4', pid: 'p2', visitId: 'v4', name: 'Lakshmi Iyer', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(0), priority: 'HIGH', delivery: 'Delivered', attempts: 0, status: 'SCHEDULED' },
  { id: 'w5', pid: 'p5', visitId: 'v5', name: 'Vijay Menon', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(0), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'SCHEDULED' },
  { id: 'w6', pid: 'p4', visitId: 'v6', name: 'Anjali Deshpande', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(3), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },
  { id: 'w7', pid: 'p7', visitId: 'v7', name: 'Fatima Sheikh', cat: 'SPECIALIST_REFERRAL', detail: '', dueDate: daysFromNow(7), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
  { id: 'w8', pid: 'p8', visitId: 'v8', name: 'Ganesh Pawar', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(-4), priority: 'NORMAL', delivery: '—', attempts: 3, status: 'SCHEDULED' },
  { id: 'w9', pid: 'p9', visitId: 'v9', name: 'Meena Joshi', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-9), priority: 'HIGH', delivery: 'Failed', attempts: 4, status: 'SCHEDULED' },
  { id: 'w10', pid: 'p1', visitId: 'v10', name: 'Ramesh Kulkarni', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(22), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
];

/** Fixed instant used for every migrated seed Visit — no real capture time exists for legacy fixture data. */
const SEED_VISIT_DATETIME = new Date('2026-06-01T09:00:00.000Z');

/**
 * BR-006 migration: every seed WorkStep above referenced no Visit at all.
 * Each now carries a `visitId`; this derives the one-per-step Visit it
 * resolves to, so no seed step is exempted from the invariant.
 */
export const SEED_VISITS: Visit[] = WORK.map((w) => ({
  visitId: w.visitId,
  patientId: w.pid,
  doctorId: 'seed-doctor',
  visitDateTime: SEED_VISIT_DATETIME,
  isBackdated: false,
  createdBy: 'seed-admin',
  createdAt: SEED_VISIT_DATETIME,
}));

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

const CAT_LABELS = ['Follow-up visits', 'Investigations', 'Referrals', 'Phone calls'];
const CAT_COLORS = ['#1E14BE', '#2E9E6B', '#6165DE', '#C35721'];
function catBars(rows: { p: number; of: string }[]) {
  return rows.map((r, i) => ({
    label: CAT_LABELS[i],
    pctLabel: `${r.p}% (${r.of})`,
    width: `${r.p}%`,
    color: CAT_COLORS[i],
  }));
}

const BL_LABELS = ['1–7 d', '8–30 d', '31–90 d', '90+ d'];
const BL_COLORS = ['#EB956A', '#C35721', '#994242', '#751A1A'];
function backlog(values: number[]) {
  const max = Math.max(1, ...values);
  return values.map((v, i) => ({
    label: BL_LABELS[i],
    value: v,
    height: v === 0 ? '6%' : `${Math.round(Math.max(0.2, v / max) * 88)}%`,
    color: BL_COLORS[i],
  }));
}

const FT_LABELS = [
  'Patients contacted',
  'Follow-up calls completed',
  'Referral completion',
  'Average days to complete',
  'Patients unreachable',
  'Lost to follow-up recovered',
];
const FT_STYLES: [string, string][] = [
  ['#1E14BE', '#EFEDFF'],
  ['#C35721', '#FBEDE4'],
  ['#6165DE', '#EEEDFB'],
  ['#2E9E6B', '#E4F7EE'],
  ['#994242', '#FDECEC'],
  ['#128C4A', '#E4F7EE'],
];
function followThrough(values: string[]) {
  return values.map((v, i) => ({ value: v, label: FT_LABELS[i], color: FT_STYLES[i][0], bg: FT_STYLES[i][1] }));
}
const FT_NOTE = 'Every figure comes only from next-step follow-through — never clinical outcomes.';

/** Insights per selected period (days). Driven by the 7/30/90 chips. */
export const INSIGHTS_BY_PERIOD: Record<number, Insights> = {
  7: {
    completionRate: 74,
    completionOf: '14 of 19',
    prevRate: 70,
    deltaPts: 4,
    trend: [70, 71, 73, 72, 74],
    catBars: catBars([{ p: 80, of: '8/10' }, { p: 71, of: '5/7' }, { p: 57, of: '4/7' }, { p: 86, of: '6/7' }]),
    backlogBars: backlog([1, 1, 0, 0]),
    referral: { rate: 57, ofLabel: '4 of 7 completed', medianDays: 9 },
    followThrough: followThrough(['48', '11', '57%', '9 days', '3', '1']),
    followThroughNote: FT_NOTE,
  },
  30: {
    completionRate: 78,
    completionOf: '46 of 59',
    prevRate: 71,
    deltaPts: 7,
    trend: [64, 68, 71, 73, 78],
    catBars: catBars([{ p: 82, of: '28/34' }, { p: 74, of: '17/23' }, { p: 61, of: '11/18' }, { p: 88, of: '22/25' }]),
    backlogBars: backlog([2, 2, 0, 0]),
    referral: { rate: 61, ofLabel: '11 of 18 completed', medianDays: 11 },
    followThrough: followThrough(['182', '41', '61%', '11 days', '6', '4']),
    followThroughNote: FT_NOTE,
  },
  90: {
    completionRate: 80,
    completionOf: '141 of 176',
    prevRate: 74,
    deltaPts: 6,
    trend: [70, 73, 75, 78, 80],
    catBars: catBars([{ p: 84, of: '70/83' }, { p: 77, of: '52/68' }, { p: 63, of: '34/54' }, { p: 90, of: '61/68' }]),
    backlogBars: backlog([3, 4, 2, 1]),
    referral: { rate: 63, ofLabel: '34 of 54 completed', medianDays: 12 },
    followThrough: followThrough(['512', '128', '63%', '12 days', '14', '11']),
    followThroughNote: FT_NOTE,
  },
};

export const INSIGHTS: Insights = INSIGHTS_BY_PERIOD[30];
