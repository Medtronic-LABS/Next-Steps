// OpenPHC & Next Steps Core Data Contracts
// Compliant with OpenPHC CCE (cce-collector-service, cce-common-util) & Next Steps Technical SRS

// --- CloudEvents v1.0 Envelope ---
export interface CloudEvent<T = any> {
  specversion: "1.0";
  id: string;
  source: string; // e.g. "org.openphc.nextsteps.sc-ghurehta"
  type: string;   // e.g. "org.openphc.task.created", "org.openphc.task.completed"
  subject: string; // Patient ID / reference without prefix
  datacontenttype: "application/json";
  time: string;   // ISO-8601
  data: T;        // Raw FHIR R4 Task resource
  // CloudEvents OpenPHC extension attributes
  facilityid?: string;
  sourceeventid?: string;
  protocolinstanceid?: string;
  protocoldefinitionid?: string;
  actionid?: string;
}

// --- FHIR R4 Task Resource ---
export interface FHIRTaskCoding {
  system: string;
  code: string;
  display: string;
}

export interface FHIRTask {
  resourceType: "Task";
  id: string;
  identifier: Array<{
    system: "urn:openphc:step-id";
    value: string;
  }>;
  status: "draft" | "requested" | "received" | "accepted" | "rejected" | "ready" | "cancelled" | "in-progress" | "on-hold" | "failed" | "completed" | "entered-in-error";
  intent: "order";
  priority?: "routine" | "urgent" | "asap" | "stat";
  code: {
    coding: FHIRTaskCoding[];
    text?: string;
  };
  description?: string;
  for: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
  };
  authoredOn: string;
  lastModified: string;
  owner?: {
    reference: string;
    display?: string;
  };
  restriction?: {
    period: {
      end: string; // YYYY-MM-DD due date
    };
  };
  output?: Array<{
    type: { text: string };
    valueString: string;
  }>;
}

// --- Next Steps Domain Types ---

export type ServiceDomain = "ANC" | "PNC" | "NCD" | "CANCER";

export type RoleId = 
  | "asha"       // ASHA - Village level
  | "anm"        // ANM / CHO - Sub-centre level
  | "phc_sn"     // PHC Staff Nurse
  | "chc_sn"     // CHC Staff Nurse
  | "dh_sn"      // District Hospital Staff Nurse
  | "tert_sn"    // Tertiary Care Staff Nurse
  | "phc_mo"     // PHC Medical Officer
  | "dpo";       // District Programme Officer

export type FacilityLevel = "SUBCENTRE" | "PHC" | "CHC" | "DH" | "TERTIARY";

export type StepCategory = 
  | "REFERRAL" 
  | "ANC_VISIT" 
  | "PMSMA_VISIT" 
  | "FOLLOW_UP" 
  | "LAB" 
  | "IMAGING" 
  | "TREATMENT" 
  | "PNC_VISIT" 
  | "NB_CHECK" 
  | "HOME_VISIT"
  | "HBNC"
  | "REF_PW"
  | "REF_NB"
  | "BP_CHECK"
  | "SUGAR_TEST"
  | "REFILL"
  | "CONSULTATION";

export type StepStatus = "SCHEDULED" | "PENDING" | "COMPLETED" | "CANCELLED" | "DECLINED";

export type Attribution = "FACILITY_CONFIRMED" | "REPORTED";

export type CompletionLocation = 
  | "REFERRED_PUBLIC_FACILITY" 
  | "OTHER_PUBLIC" 
  | "PRIVATE_FACILITY";

export type TrackingOutcomeType =
  | "COMPLETED_REFERRED_PUBLIC"
  | "COMPLETED_OTHER_PUBLIC"
  | "COMPLETED_PRIVATE"
  | "PLAN_TO_GO_LATER"
  | "DOES_NOT_WANT_TO_GO"
  | "UNREACHABLE_RELOCATED";

export interface Patient {
  id: string;
  name: string;
  nameHi?: string;
  age?: number;
  phone: string;
  village: string;
  ashaName: string;
  ashaPhone: string;
  status: "NORMAL" | "HRP"; // Binary routing flag, NO clinical reason (BR-017)
  service: ServiceDomain;
  abhaId?: string;
  rchId?: string;
  lmpDate?: string;       // For ANC gestation calculation
  deliveryDate?: string;  // For PNC
  riskReason?: string;
  consentWhatsApp: boolean;
  homeSubcentreId: string;
  createdAt: string;
}

export type ActiveDialog =
  | { type: "referral"; woman: Patient; step?: NextStep; preselectedLevel?: FacilityLevel }
  | { type: "anc_visit"; woman: Patient; step?: NextStep }
  | { type: "pmsma_visit"; woman: Patient; step?: NextStep }
  | { type: "usg"; woman: Patient; step?: NextStep }
  | { type: "asha_ref"; woman: Patient; step?: NextStep }
  | { type: "hbnc"; woman: Patient; step?: NextStep }
  | { type: "action_sheet"; woman: Patient; step: NextStep }
  | { type: "close_step"; woman: Patient; step: NextStep }
  | { type: "reschedule"; woman: Patient; step: NextStep }
  | { type: "sms_preview"; woman: Patient; step: NextStep; customText?: string }
  | { type: "scan_qr" }
  | { type: "profile"; woman: Patient }
  | { type: "lab_test"; woman: Patient }
  | null;

export interface Visit {
  id: string;
  patientId: string;
  facilityId: string;
  recordedByRole: RoleId;
  visitDateTime: string;
  isBackdated: boolean;
}

export interface NextStep {
  id: string;
  visitId: string;
  patientId: string;
  service: ServiceDomain;
  category: StepCategory;
  targetFacilityId?: string;
  targetFacilityName?: string;
  direction?: "UPWARD" | "DOWNWARD";
  dueDate: string; // YYYY-MM-DD
  priority: "ROUTINE" | "URGENT";
  status: StepStatus;
  detailText?: string; // Cap 200 chars, non-clinical coordination detail only
  
  // Escalation & SLA
  escalationCount: number;
  lastEscalatedAt?: string;
  escalationClockAnchor?: string; // Reset if patient plans to go later
  
  // Closure fields
  attribution?: Attribution;
  completionLocation?: CompletionLocation;
  trackingOutcome?: TrackingOutcomeType;
  closedAt?: string;
  closedByRole?: RoleId;
  closedAtFacilityId?: string;
  
  createdAt: string;
  createdByRole: RoleId;
}

export interface StepHistory {
  id: string;
  stepId: string;
  at: string;
  byRole: RoleId;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  attribution?: Attribution;
  reason?: string;
}

export interface EscalationAlert {
  id: string;
  stepId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  village: string;
  ashaName: string;
  category: StepCategory;
  dueDate: string;
  daysOverdue: number;
  escalationCount: number;
  assignedRole: "asha" | "anm";
  acknowledged: boolean;
  createdAt: string;
}

export interface OutboxEvent {
  id: string;
  stepId: string;
  eventType: string;
  payload: CloudEvent<FHIRTask>;
  status: "QUEUED" | "SENT" | "FAILED";
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  errorMessage?: string;
}
