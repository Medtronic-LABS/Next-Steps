import { CloudEvent, FHIRTask, NextStep, Patient, StepCategory, StepStatus } from "./types";

// Maps internal Next Steps category to OpenPHC FHIR Task.code
const CATEGORY_FHIR_MAPPING: Record<StepCategory, { code: string; display: string }> = {
  REFERRAL: {
    code: "specialist-referral",
    display: "Specialist Referral",
  },
  ANC_VISIT: {
    code: "follow-up-visit",
    display: "Antenatal Care Visit",
  },
  PMSMA_VISIT: {
    code: "special-programme-visit",
    display: "PMSMA Monthly Session",
  },
  FOLLOW_UP: {
    code: "follow-up-visit",
    display: "Routine Follow-up",
  },
  LAB: {
    code: "laboratory-investigation",
    display: "Laboratory Investigation",
  },
  IMAGING: {
    code: "diagnostic-imaging",
    display: "Ultrasound / Imaging",
  },
  TREATMENT: {
    code: "treatment-administration",
    display: "Treatment Administration",
  },
  PNC_VISIT: {
    code: "postnatal-visit",
    display: "Postnatal Care Visit",
  },
  NB_CHECK: {
    code: "newborn-check",
    display: "Newborn Assessment",
  },
  REFILL: {
    code: "medication-refill",
    display: "Medication Refill",
  },
  HOME_VISIT: {
    code: "home-visit",
    display: "Home Visit",
  },
  HBNC: {
    code: "hbnc-visit",
    display: "Home-Based Newborn Care Visit",
  },
  REF_PW: {
    code: "specialist-referral-pw",
    display: "Pregnant Woman Specialist Referral",
  },
  REF_NB: {
    code: "specialist-referral-nb",
    display: "Newborn Specialist Referral",
  },
  BP_CHECK: {
    code: "bp-check",
    display: "Blood Pressure Monitoring",
  },
  SUGAR_TEST: {
    code: "sugar-test",
    display: "Blood Sugar Test",
  },
  CONSULTATION: {
    code: "consultation",
    display: "Clinical Consultation",
  },
};

// Maps internal status to FHIR Task.status
const STATUS_FHIR_MAPPING: Record<StepStatus, FHIRTask["status"]> = {
  SCHEDULED: "requested",
  PENDING: "ready",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DECLINED: "rejected",
};

/**
 * Serializes a NextStep commitment into an OpenPHC CloudEvent v1.0
 * carrying a FHIR R4 Task resource, ready for POST /v1/events
 */
export function buildCloudEvent(
  step: NextStep,
  patient: Patient,
  eventType: "org.openphc.task.created" | "org.openphc.task.completed" | "org.openphc.task.escalated" | "org.openphc.task.cancelled",
  facilityId: string
): CloudEvent<FHIRTask> {
  const fhirCode = CATEGORY_FHIR_MAPPING[step.category] || {
    code: "other-action",
    display: "Other Action",
  };

  const fhirTask: FHIRTask = {
    resourceType: "Task",
    id: step.id,
    identifier: [
      {
        system: "urn:openphc:step-id",
        value: step.id,
      },
    ],
    status: STATUS_FHIR_MAPPING[step.status] || "requested",
    intent: "order",
    priority: step.priority === "URGENT" ? "urgent" : "routine",
    code: {
      coding: [
        {
          system: "http://openphc.org/fhir/CodeSystem/task-category",
          code: fhirCode.code,
          display: fhirCode.display,
        },
      ],
      text: fhirCode.display,
    },
    for: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${step.visitId}`,
    },
    authoredOn: step.createdAt,
    lastModified: new Date().toISOString(),
    restriction: {
      period: {
        end: step.dueDate,
      },
    },
    output: step.attribution
      ? [
          {
            type: { text: "attribution" },
            valueString: step.attribution,
          },
          {
            type: { text: "completionLocation" },
            valueString: step.completionLocation || "REFERRED_PUBLIC_FACILITY",
          },
        ]
      : undefined,
  };

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    specversion: "1.0",
    id: eventId,
    source: `org.openphc.nextsteps.${facilityId.toLowerCase()}`,
    type: eventType,
    subject: `Patient/${patient.id}`,
    datacontenttype: "application/json",
    time: new Date().toISOString(),
    facilityid: facilityId,
    protocolinstanceid: `proto_${patient.id}`,
    protocoldefinitionid: `cce-maternal-v1`,
    actionid: step.category.toLowerCase(),
    data: fhirTask,
  };
}
