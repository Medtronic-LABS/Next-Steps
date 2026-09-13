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
  data: Record<string, any>;
}

/**
 * Transforms a Next-Steps care step into an official CloudEvents 1.0 FHIR Task envelope
 * accepted by the CCE Collector Service.
 */
export function transformStepToCloudEvent(step: NextStepRecord, patientUpid?: string): CloudEventPayload {
  const eventId = `evt-${step.id.slice(0, 20)}-${Date.now().toString(36)}`;
  const correlationId = `corr-${uuidv4().slice(0, 16)}`;
  const nowIso = new Date().toISOString();
  const upid = patientUpid || `Patient/${step.patient_id}`;

  const fhirTaskStatus = step.status === 'DONE' ? 'completed' : step.status === 'CANCELLED' ? 'cancelled' : 'requested';

  const fhirTask = {
    resourceType: 'Task',
    id: `task-${step.id}`,
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
    note: step.closed_source
      ? [
          {
            text: `Closed via ${step.closed_source} at ${step.closed_level || step.level} by ${step.closed_by || 'Staff'}`,
          },
        ]
      : undefined,
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
    data: fhirTask,
  };
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
