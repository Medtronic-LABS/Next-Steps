// Patient identity resolution (PRD §17). No I/O, no framework.
//
// The CCE collector walks a Patient's identifier[] for a system matching its
// own deployment configuration, and silently falls back to Patient.id if
// none matches — a wrong or absent system produces no error, just
// correlation against the wrong value. resolveUpid and buildFhirPatient are
// the one place that logic is expressed on this side, so every emitted
// `subject` and every FHIR Patient resource goes through them rather than a
// hardcoded system URI at each call site.

import type { Identifier, Patient } from './types';

/** §17 default UPID system URI; deployment configuration may override it. */
export const DEFAULT_UPID_SYSTEM = 'http://openphc.org/identifier/upid';

/** Assigned to every patient at registration, regardless of programme enrolment. */
export const LOCAL_IDENTIFIER_SYSTEM = 'http://next-steps.local/identifier/patient';

export interface IdentityConfig {
  /** Deployment configuration (`cce.collector.fhir.patient-identifier-system`); defaults to DEFAULT_UPID_SYSTEM. */
  patientIdentifierSystem?: string;
}

/** A minimal FHIR R4 Patient resource, sufficient for the collector's identifier walk. */
export interface FhirPatient {
  resourceType: 'Patient';
  identifier: Identifier[];
}

/**
 * §17: the value of the identifier under the configured system, falling back
 * to the local identifier (then to any identifier, then to Patient.id) when
 * none matches. Every event's `subject` flows through this function — it
 * never throws, since patients reaching a clinic before their programme
 * registration completes must remain fully usable.
 */
export function resolveUpid(patient: Patient, config?: IdentityConfig): string {
  const system = config?.patientIdentifierSystem ?? DEFAULT_UPID_SYSTEM;
  const identifiers = patient.identifier ?? [];
  const configured = identifiers.find((i) => i.system === system);
  if (configured) return configured.value;
  const local = identifiers.find((i) => i.system === LOCAL_IDENTIFIER_SYSTEM);
  if (local) return local.value;
  return identifiers[0]?.value ?? patient.id;
}

/**
 * §17, verified collector behaviour: builds a minimal FHIR Patient carrying
 * exactly one identifier, under the configured system URI, valued at
 * resolveUpid's result — so the collector's identifier walk always finds a
 * match and never silently falls back to Patient.id.
 */
export function buildFhirPatient(patient: Patient, config?: IdentityConfig): FhirPatient {
  const system = config?.patientIdentifierSystem ?? DEFAULT_UPID_SYSTEM;
  return {
    resourceType: 'Patient',
    identifier: [{ system, value: resolveUpid(patient, config) }],
  };
}
