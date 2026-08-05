// Seed clinic — the approved prototype's synthetic data. One clinic
// (Anand Diabetes Care), nine patients, ten next steps across all sections and
// statuses, plus the doctor's pre-aggregated drill and insight figures.

import { LOCAL_IDENTIFIER_SYSTEM } from './identity';
import type { Clinic, DrillKey, Patient, Visit, WorkStep } from './types';

export const CLINIC: Clinic = { name: 'Anand Diabetes Care', admin: 'Priya', doctor: 'Dr. Meera Anand' };

/** Stable seed patient UUIDs (§15, §10.1) — fixed, not regenerated per run, so the fixture stays reproducible. */
const SEED_PATIENT_IDS = {
  p1: '8f14e45f-ceea-4b3e-8f34-0d5a1e5f8a01',
  p2: '4b166ba9-2ecc-4633-a5fa-a3e3f3e5b502',
  p3: 'd3486ae9-136e-4b40-9e94-1cc9f4c5f503',
  p4: '9f61408e-3afb-49d9-9c88-1de51f5b5f04',
  p5: '2fa9de6c-2d3c-4b93-8f6a-2c4a5d5f2a05',
  p6: '7cf184f4-0a71-4a5f-9a5e-5a3d8e9f4b06',
  p7: 'c1f9a1a1-2e3d-4f5a-8b6c-7d8e9f0a1b07',
  p8: 'a9d1c8b4-3e2f-4a1b-9c8d-6e5f4a3b2c08',
  p9: '5e2d1c0b-9a8f-4e7d-8c6b-5a4938271609',
} as const;

export const PATIENTS: Patient[] = [
  { id: SEED_PATIENT_IDS.p1, name: 'Ramesh Kulkarni', mobile: '98450 12210', gender: 'Male', age: 58, cid: '2043', open: 2, overdue: 1, last: '28 Jun', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p1 }] },
  { id: SEED_PATIENT_IDS.p2, name: 'Lakshmi Iyer', mobile: '99001 44821', gender: 'Female', age: 63, cid: '1188', open: 1, overdue: 0, last: '6 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p2 }] },
  { id: SEED_PATIENT_IDS.p3, name: 'Iqbal Khan', mobile: '98866 55214', gender: 'Male', age: 51, cid: '2210', open: 1, overdue: 1, last: '30 Jun', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p3 }] },
  { id: SEED_PATIENT_IDS.p4, name: 'Anjali Deshpande', mobile: '97400 90013', gender: 'Female', age: 52, cid: '1902', open: 1, overdue: 0, last: '2 Jul', consent: false, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p4 }] },
  { id: SEED_PATIENT_IDS.p5, name: 'Vijay Menon', mobile: '90080 12234', gender: 'Male', age: 60, cid: '2077', open: 1, overdue: 0, last: '6 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p5 }] },
  { id: SEED_PATIENT_IDS.p6, name: 'Sunita Rao', mobile: '98220 33417', gender: 'Female', age: 55, cid: '1450', open: 1, overdue: 1, last: '1 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p6 }] },
  { id: SEED_PATIENT_IDS.p7, name: 'Fatima Sheikh', mobile: '97390 88123', gender: 'Female', age: 48, cid: '2301', open: 1, overdue: 0, last: '6 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p7 }] },
  { id: SEED_PATIENT_IDS.p8, name: 'Ganesh Pawar', mobile: '90192 44556', gender: 'Male', age: 62, cid: '1677', open: 1, overdue: 1, last: '2 Jul', consent: false, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p8 }] },
  { id: SEED_PATIENT_IDS.p9, name: 'Meena Joshi', mobile: '98800 21190', gender: 'Female', age: 59, cid: '1988', open: 1, overdue: 1, last: '27 Jun', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p9 }] },
];

/** Avatar background|foreground pairs, cycled by patient index. */
export const AVATARS = ['#EFEDFF|#1E14BE', '#E4F7EE|#128C4A', '#ECEDFB|#6165DE', '#FBEDE4|#C35721', '#FDECEC|#994242'];

const SEED_DAY_MS = 24 * 60 * 60 * 1000;

/** Seed due dates are offsets from load time, not absolute dates, so the demo never goes stale (see ITEM-3-TEST-CASES.md TC-SEED-001). */
function daysFromNow(offset: number): Date {
  return new Date(Date.now() + offset * SEED_DAY_MS);
}

export const WORK: WorkStep[] = [
  { id: 'w1', pid: SEED_PATIENT_IDS.p1, visitId: 'v1', name: 'Ramesh Kulkarni', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-8), priority: 'HIGH', delivery: 'Read', attempts: 0, status: 'SCHEDULED' },
  { id: 'w2', pid: SEED_PATIENT_IDS.p6, visitId: 'v2', name: 'Sunita Rao', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(-5), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'SCHEDULED' },
  { id: 'w3', pid: SEED_PATIENT_IDS.p3, visitId: 'v3', name: 'Iqbal Khan', cat: 'SPECIALIST_REFERRAL', detail: '', dueDate: daysFromNow(-6), priority: 'NORMAL', delivery: 'Failed', attempts: 1, status: 'SCHEDULED' },
  { id: 'w4', pid: SEED_PATIENT_IDS.p2, visitId: 'v4', name: 'Lakshmi Iyer', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(0), priority: 'HIGH', delivery: 'Delivered', attempts: 0, status: 'SCHEDULED' },
  { id: 'w5', pid: SEED_PATIENT_IDS.p5, visitId: 'v5', name: 'Vijay Menon', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(0), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'SCHEDULED' },
  { id: 'w6', pid: SEED_PATIENT_IDS.p4, visitId: 'v6', name: 'Anjali Deshpande', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(3), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },
  { id: 'w7', pid: SEED_PATIENT_IDS.p7, visitId: 'v7', name: 'Fatima Sheikh', cat: 'SPECIALIST_REFERRAL', detail: '', dueDate: daysFromNow(7), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
  { id: 'w8', pid: SEED_PATIENT_IDS.p8, visitId: 'v8', name: 'Ganesh Pawar', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(-4), priority: 'NORMAL', delivery: '—', attempts: 3, status: 'SCHEDULED' },
  { id: 'w9', pid: SEED_PATIENT_IDS.p9, visitId: 'v9', name: 'Meena Joshi', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-9), priority: 'HIGH', delivery: 'Failed', attempts: 4, status: 'SCHEDULED' },
  { id: 'w10', pid: SEED_PATIENT_IDS.p1, visitId: 'v10', name: 'Ramesh Kulkarni', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(22), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
  // Closed steps (TC-SEED-002): real completions, spread across the last 30
  // days, so the completion, on-time and median-days figures are derived
  // from actual coordination state rather than a fixture (BR-018).
  { id: 'w11', pid: SEED_PATIENT_IDS.p2, visitId: 'v11', name: 'Lakshmi Iyer', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(-10), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-12) },
  { id: 'w12', pid: SEED_PATIENT_IDS.p3, visitId: 'v12', name: 'Iqbal Khan', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-15), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-15) },
  { id: 'w13', pid: SEED_PATIENT_IDS.p4, visitId: 'v13', name: 'Anjali Deshpande', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(-20), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-21) },
  { id: 'w14', pid: SEED_PATIENT_IDS.p5, visitId: 'v14', name: 'Vijay Menon', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-3), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-5) },
  { id: 'w15', pid: SEED_PATIENT_IDS.p6, visitId: 'v15', name: 'Sunita Rao', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(-25), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-27) },
  { id: 'w16', pid: SEED_PATIENT_IDS.p7, visitId: 'v16', name: 'Fatima Sheikh', cat: 'SPECIALIST_REFERRAL', detail: '', dueDate: daysFromNow(-18), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-10) },
  { id: 'w17', pid: SEED_PATIENT_IDS.p8, visitId: 'v17', name: 'Ganesh Pawar', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(-22), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-14) },
  { id: 'w18', pid: SEED_PATIENT_IDS.p9, visitId: 'v18', name: 'Meena Joshi', cat: 'LAB_INVESTIGATION', detail: '', dueDate: daysFromNow(-12), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-2) },
  { id: 'w19', pid: SEED_PATIENT_IDS.p1, visitId: 'v19', name: 'Ramesh Kulkarni', cat: 'FOLLOW_UP_VISIT', detail: 'Follow-up visit', dueDate: daysFromNow(-6), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-1) },
  { id: 'w20', pid: SEED_PATIENT_IDS.p2, visitId: 'v20', name: 'Lakshmi Iyer', cat: 'FOLLOW_UP_CALL', detail: 'Check-in call', dueDate: daysFromNow(-14), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'DECLINED', declineReason: 'Patient no longer wants this follow-up' },
  { id: 'w21', pid: SEED_PATIENT_IDS.p3, visitId: 'v21', name: 'Iqbal Khan', cat: 'SPECIALIST_REFERRAL', detail: '', dueDate: daysFromNow(-8), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'CANCELLED', reason: 'Entered in error' },
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

/** Summary-card metadata (value comes from live drill-down counts, computed in inMemoryEngine.ts). */
export const CARD_DEFS: { key: DrillKey; label: string; color: string; soft: string; iconPath: string }[] = [
  { key: 'overdue', label: 'Overdue next steps', color: '#994242', soft: '#FDECEC', iconPath: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01' },
  { key: 'LAB_INVESTIGATION', label: 'Investigations pending', color: '#2E9E6B', soft: '#E4F7EE', iconPath: 'M9 2h6M10 2v6.5L5.5 17a3 3 0 0 0 2.7 4.3h7.6A3 3 0 0 0 18.5 17L14 8.5V2M8 14h8' },
  { key: 'SPECIALIST_REFERRAL', label: 'Referrals pending', color: '#6165DE', soft: '#ECEDFB', iconPath: 'M4 3v6a4 4 0 0 0 8 0V3M8 15v1a5 5 0 0 0 10 0v-1M18 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z' },
  { key: 'unreach', label: 'Unreachable patients', color: '#C35721', soft: '#FBEDE4', iconPath: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92ZM2 2l20 20' },
  { key: 'lost', label: 'Lost to follow-up', color: '#909090', soft: '#F0EFEC', iconPath: 'M18 21a8 8 0 0 0-16 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 11l-3 3M19 11l3 3' },
];

