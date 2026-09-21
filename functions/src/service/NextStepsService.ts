/**
 * Clean service-layer facade (prototype addendum — "Important architecture
 * principle": WhatsApp is a channel, not the system of record). This module
 * is what a future swap to the real Next Steps/CCE backend would need to
 * reimplement behind the same names — new capabilities (patient creation,
 * generalized next steps, journey view) route through here, not through
 * domain/*.ts directly.
 *
 * REFERRAL-specific flows (ReferralService.stageStep/confirmStep,
 * ClosureService.closeStep called with a provenance) predate this facade
 * and still call their domain services directly from the workflow layer —
 * migrating those call sites is mechanical but out of scope for this pass.
 */
export { searchPatients, createPatient, listAllPatients, getPatientById } from '../domain/PatientService.js';
export { getPatientJourney } from '../domain/PatientJourneyService.js';
export { createNextStep, completeNextStep } from '../domain/NextStepService.js';
export { getWorklistSummary as getWorklist } from '../domain/WorklistService.js';
export { rescheduleStep as rescheduleNextStep } from '../domain/RescheduleService.js';
export { getExpectedArrivals, recordArrival } from '../domain/ArrivalService.js';
