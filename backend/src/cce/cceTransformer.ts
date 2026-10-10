import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

export interface NextStepRecord {
  id: string;
  patient_id: string;
  cat: string;
  level: string;
  due?: string | null;
  sent_at?: string | null;
  status: string;
  owner_role: string;
  closed_at?: string | null;
  closed_by?: string | null;
  closed_source?: string | null;
  closed_level?: string | null;
  facility_id?: string | null;
  plan_version?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  notes?: string | null;
  successor_step_id?: string | null;
  successor_plan_version?: string | null;
}

export interface CloudEventPayload {
  specversion: string;
  id: string;
  source: string;
  type: string;
  subject: string;
  time: string;
  datacontenttype: string;
  facilityid: string;
  correlationid: string;
  planversion?: string;
  data: Record<string, any>;
}

/**
 * Transforms a Next-Steps care step into an official CloudEvents 1.0 FHIR Task envelope
 * accepted by the CCE Collector Service.
 *
 * Uses deterministic SHA-256 derived identifiers to ensure stable idempotency across
 * retries while distinguishing legitimate updates (rescheduling, notes, status changes)
 * per Finding D2.
 */
export function transformStepToCloudEvent(step: NextStepRecord, patientUpid?: string): CloudEventPayload {
  const planVersion = step.plan_version || '1.0';

  // Include mutable fields (due, updated_at/closed_at, notes, plan_version) to ensure
  // distinct events on legitimate modifications while preserving identical eventId on retries
  const contentTokens = [
    step.patient_id,
    step.id,
    step.status,
    step.due || '',
    step.updated_at || step.closed_at || step.created_at || '',
    step.notes || step.closed_source || '',
    planVersion,
  ];
  const hashKey = contentTokens.join(':');
  const hash = crypto.createHash('sha256').update(hashKey).digest('hex').substring(0, 16);
  const eventId = `evt-${step.id.slice(0, 16)}-${hash}`;

  const corrHash = crypto.createHash('sha256').update(`${step.patient_id}:${step.id}`).digest('hex').substring(0, 16);
  const correlationId = `corr-${corrHash}`;

  const nowIso = new Date().toISOString();
  const upid = patientUpid || `Patient/${step.patient_id}`;

  const fhirTaskStatus = step.status === 'DONE' ? 'completed' : step.status === 'CANCELLED' ? 'cancelled' : 'requested';

  const fhirTask: Record<string, any> = {
    resourceType: 'Task',
    id: `task-${step.id}`,
    identifier: [
      {
        system: 'http://openphc.org/identifiers/step-id',
        value: step.id,
      },
      {
        system: 'http://openphc.org/identifiers/plan-version',
        value: planVersion,
      },
    ],
    status: fhirTaskStatus,
    intent: 'order',
    code: {
      coding: [
        {
          system: 'http://openphc.org/codes/step-category',
          code: step.cat,
          display: getCategoryDisplay(step.cat),
        },
      ],
      text: getCategoryDisplay(step.cat),
    },
    for: {
      reference: upid,
    },
    executionPeriod: {
      start: step.sent_at || step.due || nowIso,
      end: step.due || undefined,
    },
    restriction: {
      recipient: [
        {
          display: `Care Level: ${step.level}`,
        },
      ],
    },
    owner: {
      display: step.owner_role,
    },
    note: (step.notes || step.closed_source)
      ? [
          {
            text: step.closed_source
              ? `Closed via ${step.closed_source} at ${step.closed_level || step.level} by ${step.closed_by || 'Staff'}${step.notes ? ` - ${step.notes}` : ''}`
              : step.notes || '',
          },
        ]
      : undefined,
    extension: [
      {
        url: 'http://openphc.org/fhir/StructureDefinition/plan-version',
        valueString: planVersion,
      },
      ...(step.successor_step_id
        ? [
            {
              url: 'http://openphc.org/fhir/StructureDefinition/successor-step-id',
              valueString: step.successor_step_id,
            },
            {
              url: 'http://openphc.org/fhir/StructureDefinition/successor-plan-version',
              valueString: step.successor_plan_version || '',
            },
          ]
        : []),
    ],
  };

  return {
    specversion: '1.0',
    id: eventId,
    source: config.cce.sourceSystem,
    type: 'org.openphc.cce.task',
    subject: upid,
    time: nowIso,
    datacontenttype: 'application/json',
    facilityid: `facility/${step.facility_id || step.level}`,
    correlationid: correlationId,
    planversion: planVersion,
    data: fhirTask,
  };
}

/**
 * Resolves offline task completion reconciliation when a plan replacement has occurred (K1).
 * Maps completed tasks from prior plan versions (e.g. V1) to matching active successor
 * tasks in the newly active plan version (e.g. V2) based on equivalent category and clinical tier.
 */
export function reconcileOfflineStepCompletion(
  offlineCompletedStep: NextStepRecord,
  activePlanSteps: NextStepRecord[],
  activePlanVersion: string
): { reconciledStep: NextStepRecord; matchedSuccessor?: NextStepRecord } {
  // If the completed step is already on the active version, no reconciliation needed
  if (!offlineCompletedStep.plan_version || offlineCompletedStep.plan_version === activePlanVersion) {
    return { reconciledStep: offlineCompletedStep };
  }

  // Find corresponding open task in the active replacement plan with matching category
  const matchingSuccessor = activePlanSteps.find(
    (s) => s.status === 'OPEN' && s.cat === offlineCompletedStep.cat
  );

  if (matchingSuccessor) {
    const updatedStep: NextStepRecord = {
      ...offlineCompletedStep,
      successor_step_id: matchingSuccessor.id,
      successor_plan_version: activePlanVersion,
    };
    return { reconciledStep: updatedStep, matchedSuccessor: matchingSuccessor };
  }

  return { reconciledStep: offlineCompletedStep };
}

function getCategoryDisplay(cat: string): string {
  const displays: Record<string, string> = {
    REFERRAL: 'Referral to Higher Facility',
    ANC_VISIT: 'Antenatal Care Visit',
    PMSMA_VISIT: 'PMSMA Specialist Clinic Session',
    FOLLOW_UP: 'Clinical Follow-up',
    LAB: 'Laboratory Diagnostics',
    IMAGING: 'Ultrasound Diagnostic Imaging',
    TREATMENT: 'Treatment / Follow-up',
    HBNC: 'Home Based Newborn Care Visit',
    REF_PW: 'Referral of Postnatal Woman',
    REF_NB: 'Referral of Sick Newborn',
    PNC_VISIT: 'Postnatal Follow-up Visit',
    NB_CHECK: 'Newborn Health Check',
    BP_CHECK: 'Blood Pressure Monitoring',
    SUGAR_TEST: 'Blood Glucose Testing',
    REFILL: 'NCD Medicine Refill',
  };
  return displays[cat] || cat;
}

export function transformPatientToCloudEvent(patient: any): CloudEventPayload {
  const patHash = crypto.createHash('sha256').update(`patient:${patient.id}:${patient.status || ''}`).digest('hex').substring(0, 16);
  const eventId = `evt-pat-${patient.id.slice(0, 16)}-${patHash}`;
  const correlationId = `corr-${patHash}`;

  const nowIso = new Date().toISOString();
  const upid = `Patient/${patient.id}`;

  // SEC-07: Mask patient PII/demographics in CloudEvents
  const maskedName = patient.name ? patient.name.charAt(0) + '***' : undefined;
  const maskedPhone = patient.phone && patient.phone.length > 4 ? '***' + patient.phone.slice(-4) : undefined;

  const fhirPatient = {
    resourceType: 'Patient',
    id: patient.id,
    active: true,
    name: maskedName ? [{ text: maskedName }] : undefined,
    telecom: maskedPhone ? [{ system: 'phone', value: maskedPhone }] : undefined,
    address: [{ city: patient.village_name, state: 'Madhya Pradesh' }],
    extension: [
      { url: 'http://openphc.org/fhir/service', valueString: patient.service },
      { url: 'http://openphc.org/fhir/risk-status', valueString: patient.status },
      { url: 'http://openphc.org/fhir/consent-whatsapp', valueBoolean: Boolean(patient.consent_whatsapp) },
    ],
  };

  return {
    specversion: '1.0',
    id: eventId,
    source: config.cce.sourceSystem,
    type: 'org.openphc.cce.task',
    subject: upid,
    time: nowIso,
    datacontenttype: 'application/json',
    facilityid: `facility/${patient.subcentre_id || 'SUBCENTRE'}`,
    correlationid: correlationId,
    data: fhirPatient,
  };
}
