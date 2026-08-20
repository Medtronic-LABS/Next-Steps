// Maternal seed clinic (PRD FR-A-6.1, ITEM-6-TEST-CASES.md TC-MAT-001..004).
// A second clinic, alongside seed.ts's diabetes clinic, proving the same
// engine populates a full worklist under a different programme profile.
// Same shape as seed.ts's fixture; every step maps onto one of the five
// FR-A-5.1 categories (TC-MAT-002) and the clinic is spread across all
// five FR-A-6.1 worklist sections (TC-MAT-001).
//
// BR-017: step detail carries only the coordination action named in the
// programme reframe — "an ANC visit", "an anaemia screening", "an IFA
// adherence check" — never a schedule, threshold or dosage. BR-019: no
// named specialist, only the referral category.

import { LOCAL_IDENTIFIER_SYSTEM } from './identity';
import type { Clinic, Patient, Visit, WorkStep } from './types';

export const MATERNAL_CLINIC: Clinic = { name: 'Sahyog Maternal Health Centre', admin: 'Kavita', doctor: 'Dr. Nandini Rao' };

const SEED_PATIENT_IDS = {
  p1: 'b1a2c3d4-1111-4a5b-8c9d-0e1f2a3b4c01',
  p2: 'b1a2c3d4-2222-4a5b-8c9d-0e1f2a3b4c02',
  p3: 'b1a2c3d4-3333-4a5b-8c9d-0e1f2a3b4c03',
  p4: 'b1a2c3d4-4444-4a5b-8c9d-0e1f2a3b4c04',
  p5: 'b1a2c3d4-5555-4a5b-8c9d-0e1f2a3b4c05',
  p6: 'b1a2c3d4-6666-4a5b-8c9d-0e1f2a3b4c06',
  p7: 'b1a2c3d4-7777-4a5b-8c9d-0e1f2a3b4c07',
  p8: 'b1a2c3d4-8888-4a5b-8c9d-0e1f2a3b4c08',
} as const;

// ITEM-8-HRP-NEWBORN.md NS-3: registration additions. All eight sit in one
// sub-centre catchment (SHC-RAMPUR, ~5,000 — the ANM/CHO's scope) and one
// PMSMA village (Rampur); split across two ASHAs (~1,000 each) so the
// standalone role picker's ASHA option — and NS-1's scope isolation — has
// something real to show.
const ASHA_WARD_3 = 'Radha Kumari';
const ASHA_WARD_5 = 'Kiran Mehta';
const SHC_RAMPUR = 'SHC-RAMPUR';
const VILLAGE_RAMPUR = 'Rampur';

export const MATERNAL_PATIENTS: Patient[] = [
  { id: SEED_PATIENT_IDS.p1, name: 'Rekha Pawar', mobile: '98220 11201', gender: 'Female', age: 27, cid: '3101', open: 2, overdue: 1, last: '28 Jun', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p1 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_3, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p2, name: 'Sunita Devi', mobile: '97400 22312', gender: 'Female', age: 24, cid: '3102', open: 1, overdue: 1, last: '30 Jun', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p2 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_3, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p3, name: 'Kavita Sharma', mobile: '90080 33423', gender: 'Female', age: 30, cid: '3103', open: 2, overdue: 0, last: '6 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p3 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_3, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p4, name: 'Meena Kumari', mobile: '98800 44534', gender: 'Female', age: 22, cid: '3104', open: 1, overdue: 0, last: '5 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p4 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_3, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p5, name: 'Asha Devi', mobile: '99001 55645', gender: 'Female', age: 29, cid: '3105', open: 1, overdue: 0, last: '3 Jul', consent: false, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p5 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_3, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p6, name: 'Priyanka Yadav', mobile: '98450 66756', gender: 'Female', age: 33, cid: '3106', open: 1, overdue: 1, last: '1 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p6 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_5, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p7, name: 'Geeta Ram', mobile: '97390 77867', gender: 'Female', age: 26, cid: '3107', open: 1, overdue: 1, last: '2 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p7 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_5, registeredAtFacilityId: SHC_RAMPUR },
  { id: SEED_PATIENT_IDS.p8, name: 'Fatima Ansari', mobile: '90192 88978', gender: 'Female', age: 31, cid: '3108', open: 0, overdue: 0, last: '4 Jul', consent: true, identifier: [{ system: LOCAL_IDENTIFIER_SYSTEM, value: SEED_PATIENT_IDS.p8 }], villageName: VILLAGE_RAMPUR, ashaName: ASHA_WARD_5, registeredAtFacilityId: SHC_RAMPUR },
];

const SEED_DAY_MS = 24 * 60 * 60 * 1000;

/** Seed due dates are offsets from load time, so the demo never goes stale (ITEM-3-TEST-CASES.md TC-SEED-001 pattern). */
function daysFromNow(offset: number): Date {
  return new Date(Date.now() + offset * SEED_DAY_MS);
}

// Enriched so the demo reads as a populated clinic: completions spread
// across all five §13 trend anchors (no gaps), a ~65% overall completion
// rate, ~80% referral completion, and at least one open step aged into
// each of the four overdue buckets — believable, nothing pinned at 100%.
export const MATERNAL_WORK: WorkStep[] = [
  // FOLLOW_UP_VISIT — "ANC visit"
  { id: 'm1', pid: SEED_PATIENT_IDS.p1, visitId: 'mv1', name: 'Rekha Pawar', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-6), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-5) },
  { id: 'm2', pid: SEED_PATIENT_IDS.p2, visitId: 'mv2', name: 'Sunita Devi', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-3), priority: 'HIGH', delivery: 'Read', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-2) },
  { id: 'm3', pid: SEED_PATIENT_IDS.p6, visitId: 'mv3', name: 'Priyanka Yadav', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-25), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'DECLINED', declineReason: 'Patient no longer wants this follow-up' },
  { id: 'm4', pid: SEED_PATIENT_IDS.p1, visitId: 'mv4', name: 'Rekha Pawar', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-15), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-16) },
  { id: 'm5', pid: SEED_PATIENT_IDS.p4, visitId: 'mv5', name: 'Meena Kumari', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(10), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },
  { id: 'm6', pid: SEED_PATIENT_IDS.p1, visitId: 'mv6', name: 'Rekha Pawar', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-40), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-41) },
  { id: 'm7', pid: SEED_PATIENT_IDS.p6, visitId: 'mv7', name: 'Priyanka Yadav', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-2), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-1) },
  { id: 'm8', pid: SEED_PATIENT_IDS.p3, visitId: 'mv8', name: 'Kavita Sharma', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-98), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-99) },
  { id: 'm32', pid: SEED_PATIENT_IDS.p4, visitId: 'mv32', name: 'Meena Kumari', cat: 'FOLLOW_UP_VISIT', detail: 'ANC visit', dueDate: daysFromNow(-1), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },

  // LAB_INVESTIGATION — "Lab investigation"
  { id: 'm9', pid: SEED_PATIENT_IDS.p3, visitId: 'mv9', name: 'Kavita Sharma', cat: 'LAB_INVESTIGATION', detail: 'Anemia test', dueDate: daysFromNow(0), priority: 'HIGH', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
  { id: 'm10', pid: SEED_PATIENT_IDS.p4, visitId: 'mv10', name: 'Meena Kumari', cat: 'LAB_INVESTIGATION', detail: 'Lab investigation', dueDate: daysFromNow(4), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },
  { id: 'm11', pid: SEED_PATIENT_IDS.p4, visitId: 'mv11', name: 'Meena Kumari', cat: 'LAB_INVESTIGATION', detail: 'Lab investigation', dueDate: daysFromNow(-18), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-19) },
  { id: 'm12', pid: SEED_PATIENT_IDS.p3, visitId: 'mv12', name: 'Kavita Sharma', cat: 'LAB_INVESTIGATION', detail: 'Lab investigation', dueDate: daysFromNow(-5), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'CANCELLED', reason: 'Entered in error' },
  { id: 'm13', pid: SEED_PATIENT_IDS.p3, visitId: 'mv13', name: 'Kavita Sharma', cat: 'LAB_INVESTIGATION', detail: 'Lab investigation', dueDate: daysFromNow(-34), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
  { id: 'm14', pid: SEED_PATIENT_IDS.p4, visitId: 'mv14', name: 'Meena Kumari', cat: 'LAB_INVESTIGATION', detail: 'Lab investigation', dueDate: daysFromNow(-20), priority: 'NORMAL', delivery: 'Read', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-21) },

  // SPECIALIST_REFERRAL — "Referral"
  { id: 'm15', pid: SEED_PATIENT_IDS.p5, visitId: 'mv15', name: 'Asha Devi', cat: 'SPECIALIST_REFERRAL', detail: 'High-risk pregnancy referral', dueDate: daysFromNow(-20), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-5) },
  { id: 'm16', pid: SEED_PATIENT_IDS.p6, visitId: 'mv16', name: 'Priyanka Yadav', cat: 'SPECIALIST_REFERRAL', detail: 'High-risk pregnancy referral', dueDate: daysFromNow(-2), priority: 'NORMAL', delivery: 'Failed', attempts: 1, status: 'SCHEDULED' },
  { id: 'm17', pid: SEED_PATIENT_IDS.p6, visitId: 'mv17', name: 'Priyanka Yadav', cat: 'SPECIALIST_REFERRAL', detail: 'High-risk pregnancy referral', dueDate: daysFromNow(-12), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-13) },
  { id: 'm18', pid: SEED_PATIENT_IDS.p5, visitId: 'mv18', name: 'Asha Devi', cat: 'SPECIALIST_REFERRAL', detail: 'High-risk pregnancy referral', dueDate: daysFromNow(-9), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-1) },
  { id: 'm19', pid: SEED_PATIENT_IDS.p6, visitId: 'mv19', name: 'Priyanka Yadav', cat: 'SPECIALIST_REFERRAL', detail: 'High-risk pregnancy referral', dueDate: daysFromNow(5), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'SCHEDULED' },
  { id: 'm20', pid: SEED_PATIENT_IDS.p5, visitId: 'mv20', name: 'Asha Devi', cat: 'SPECIALIST_REFERRAL', detail: 'High-risk pregnancy referral', dueDate: daysFromNow(-1), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(0) },

  // FOLLOW_UP_CALL — "Follow-up call"
  { id: 'm21', pid: SEED_PATIENT_IDS.p7, visitId: 'mv21', name: 'Geeta Ram', cat: 'FOLLOW_UP_CALL', detail: 'IFA counselling call', dueDate: daysFromNow(-4), priority: 'NORMAL', delivery: '—', attempts: 4, status: 'SCHEDULED' },
  { id: 'm22', pid: SEED_PATIENT_IDS.p3, visitId: 'mv22', name: 'Kavita Sharma', cat: 'FOLLOW_UP_CALL', detail: 'Follow-up call', dueDate: daysFromNow(2), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'SCHEDULED' },
  { id: 'm23', pid: SEED_PATIENT_IDS.p7, visitId: 'mv23', name: 'Geeta Ram', cat: 'FOLLOW_UP_CALL', detail: 'Follow-up call', dueDate: daysFromNow(-9), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-1) },
  { id: 'm24', pid: SEED_PATIENT_IDS.p2, visitId: 'mv24', name: 'Sunita Devi', cat: 'FOLLOW_UP_CALL', detail: 'Follow-up call', dueDate: daysFromNow(-45), priority: 'NORMAL', delivery: 'Failed', attempts: 1, status: 'SCHEDULED' },
  { id: 'm25', pid: SEED_PATIENT_IDS.p8, visitId: 'mv25', name: 'Fatima Ansari', cat: 'FOLLOW_UP_CALL', detail: 'Follow-up call', dueDate: daysFromNow(-95), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },
  { id: 'm26', pid: SEED_PATIENT_IDS.p7, visitId: 'mv26', name: 'Geeta Ram', cat: 'FOLLOW_UP_CALL', detail: 'Follow-up call', dueDate: daysFromNow(-15), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'SCHEDULED' },

  // OTHER — "PMSMA visit"
  { id: 'm27', pid: SEED_PATIENT_IDS.p8, visitId: 'mv27', name: 'Fatima Ansari', cat: 'OTHER', detail: 'Immunisation reminder', dueDate: daysFromNow(-10), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(0) },
  { id: 'm28', pid: SEED_PATIENT_IDS.p1, visitId: 'mv28', name: 'Rekha Pawar', cat: 'OTHER', detail: 'PMSMA visit', dueDate: daysFromNow(20), priority: 'NORMAL', delivery: '—', attempts: 0, status: 'SCHEDULED' },
  { id: 'm29', pid: SEED_PATIENT_IDS.p8, visitId: 'mv29', name: 'Fatima Ansari', cat: 'OTHER', detail: 'Immunisation reminder', dueDate: daysFromNow(-7), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'DECLINED', declineReason: 'Patient unavailable' },
  { id: 'm30', pid: SEED_PATIENT_IDS.p2, visitId: 'mv30', name: 'Sunita Devi', cat: 'OTHER', detail: 'PMSMA visit', dueDate: daysFromNow(-3), priority: 'NORMAL', delivery: 'Delivered', attempts: 0, status: 'COMPLETED', completedDate: daysFromNow(-2) },
  { id: 'm31', pid: SEED_PATIENT_IDS.p1, visitId: 'mv31', name: 'Rekha Pawar', cat: 'OTHER', detail: 'PMSMA visit', dueDate: daysFromNow(-11), priority: 'NORMAL', delivery: 'Sent', attempts: 0, status: 'DECLINED', declineReason: 'Patient unavailable' },
];

/** Fixed instant used for every seed Visit — no real capture time exists for fixture data. */
const SEED_VISIT_DATETIME = new Date('2026-06-01T09:00:00.000Z');

/** BR-006: one Visit per step, mirroring seed.ts's migration derivation. */
export const MATERNAL_VISITS: Visit[] = MATERNAL_WORK.map((w) => ({
  visitId: w.visitId,
  patientId: w.pid,
  doctorId: 'seed-maternal-doctor',
  visitDateTime: SEED_VISIT_DATETIME,
  isBackdated: false,
  createdBy: 'seed-maternal-admin',
  createdAt: SEED_VISIT_DATETIME,
}));
