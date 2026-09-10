import Dexie, { Table } from "dexie";
import { EscalationAlert, NextStep, OutboxEvent, Patient, StepHistory, Visit } from "../openphc/types";

export interface Facility {
  id: string;
  name: string;
  level: "SUBCENTRE" | "PHC" | "CHC" | "DH" | "TERTIARY";
  shortName: string;
  tag: string;
}

export interface VillageConfig {
  name: string;
  ashaName: string;
  ashaPhone: string;
}

export class NextStepsDatabase extends Dexie {
  patients!: Table<Patient, string>;
  visits!: Table<Visit, string>;
  steps!: Table<NextStep, string>;
  history!: Table<StepHistory, string>;
  alerts!: Table<EscalationAlert, string>;
  outbox!: Table<OutboxEvent, string>;

  constructor() {
    super("NextStepsCoreDB");
    this.version(1).stores({
      patients: "id, phone, name, village, status, service, createdAt",
      visits: "id, patientId, facilityId, visitDateTime",
      steps: "id, visitId, patientId, service, category, targetFacilityId, dueDate, status, escalationCount, attribution, createdAt",
      history: "id, stepId, at, byRole",
      alerts: "id, stepId, patientId, assignedRole, acknowledged, createdAt",
      outbox: "id, stepId, status, createdAt",
    });
  }
}

export const db = new NextStepsDatabase();

// Master facilities matching the pilot chain (AP-5, NS-2)
export const FACILITIES: Facility[] = [
  { id: "SUBCENTRE", name: "Sub-centre Ghurehta", level: "SUBCENTRE", shortName: "SC", tag: "ANM / CHO" },
  { id: "PHC", name: "PHC Sirmour", level: "PHC", shortName: "PHC", tag: "MO + Staff Nurse" },
  { id: "CHC", name: "CHC Teonthar", level: "CHC", shortName: "CHC", tag: "FRU / First Referral" },
  { id: "DH", name: "District Hospital, Rewa", level: "DH", shortName: "DH", tag: "Specialist Services" },
  { id: "TERTIARY", name: "Medical College, Jabalpur", level: "TERTIARY", shortName: "TER", tag: "Advanced Tertiary" },
];

// Configured villages with linked ASHA auto-resolution (NS-3, NS-8)
export const VILLAGES: VillageConfig[] = [
  { name: "Ghurehta", ashaName: "Kamla Devi", ashaPhone: "9827011223" },
  { name: "Gharonda", ashaName: "Shanti Bai", ashaPhone: "9827011224" },
  { name: "Semri", ashaName: "Maya Verma", ashaPhone: "9827011225" },
  { name: "Bhanpur", ashaName: "Geeta Kol", ashaPhone: "9827011226" },
  { name: "Rampur Kothi", ashaName: "Sunita Patel", ashaPhone: "9827011227" },
];

export async function seedDatabaseIfEmpty() {
  const ancCount = await db.patients.where("service").equals("ANC").count();
  if (ancCount > 0) return;

  // Clear stale legacy single-domain schema if present
  await db.patients.clear();
  await db.steps.clear();
  await db.visits.clear();
  await db.alerts.clear();

  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];
  
  // Create relative dates
  const addDays = (d: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split("T")[0];
  };

  const seedPatients: Patient[] = [
    // --- ANC Cohort ---
    {
      id: "pw_01",
      name: "Sunita Devi",
      nameHi: "सुनीता देवी",
      age: 26,
      phone: "9826123451",
      village: "Ghurehta",
      ashaName: "Kamla Devi",
      ashaPhone: "9827011223",
      status: "HRP",
      service: "ANC",
      rchId: "RCH9281726",
      lmpDate: addDays(-140), // 20 weeks
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-20),
    },
    {
      id: "pw_02",
      name: "Rekha Kumari",
      nameHi: "रेखा कुमारी",
      age: 28,
      phone: "9826123452",
      village: "Gharonda",
      ashaName: "Shanti Bai",
      ashaPhone: "9827011224",
      status: "HRP",
      service: "ANC",
      rchId: "RCH8192831",
      lmpDate: addDays(-180), // ~26 weeks
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-30),
    },
    {
      id: "pw_03",
      name: "Meena Bai",
      nameHi: "मीना बाई",
      age: 22,
      phone: "9826123453",
      village: "Semri",
      ashaName: "Maya Verma",
      ashaPhone: "9827011225",
      status: "NORMAL",
      service: "ANC",
      rchId: "RCH7291823",
      lmpDate: addDays(-84), // 12 weeks
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-10),
    },
    {
      id: "pw_04",
      name: "Pooja Sharma",
      nameHi: "पूजा शर्मा",
      age: 31,
      phone: "9826123454",
      village: "Bhanpur",
      ashaName: "Geeta Kol",
      ashaPhone: "9827011226",
      status: "HRP",
      service: "ANC",
      rchId: "RCH6192834",
      lmpDate: addDays(-220), // ~31 weeks
      consentWhatsApp: false,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-15),
    },
    {
      id: "pw_05",
      name: "Gita Sharma",
      nameHi: "गीता शर्मा",
      age: 24,
      phone: "9826123455",
      village: "Ghurehta",
      ashaName: "Kamla Devi",
      ashaPhone: "9827011223",
      status: "HRP",
      service: "ANC",
      rchId: "RCH5192835",
      lmpDate: addDays(-160),
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-25),
    },

    // --- PNC & Newborn Cohort ---
    {
      id: "pnc_01",
      name: "Lakshmi Bai",
      nameHi: "लक्ष्मी बाई",
      age: 27,
      phone: "9826123460",
      village: "Gharonda",
      ashaName: "Shanti Bai",
      ashaPhone: "9827011224",
      status: "HRP", // Danger signs
      service: "PNC",
      rchId: "RCH3344551",
      deliveryDate: addDays(-5),
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-6),
    },
    {
      id: "pnc_02",
      name: "Kiran Devi",
      nameHi: "किरण देवी",
      age: 23,
      phone: "9826123461",
      village: "Semri",
      ashaName: "Maya Verma",
      ashaPhone: "9827011225",
      status: "NORMAL",
      service: "PNC",
      rchId: "RCH3344552",
      deliveryDate: addDays(-14),
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-15),
    },

    // --- NCD Cohort ---
    {
      id: "ncd_01",
      name: "Ramesh Kumar",
      nameHi: "रमेश कुमार",
      age: 54,
      phone: "9826123470",
      village: "Ghurehta",
      ashaName: "Kamla Devi",
      ashaPhone: "9827011223",
      status: "HRP", // Uncontrolled
      service: "NCD",
      abhaId: "14-8899-0011-22",
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-40),
    },
    {
      id: "ncd_02",
      name: "Champa Bai",
      nameHi: "चम्पा बाई",
      age: 61,
      phone: "9826123471",
      village: "Bhanpur",
      ashaName: "Geeta Kol",
      ashaPhone: "9827011226",
      status: "NORMAL",
      service: "NCD",
      abhaId: "14-8899-0011-33",
      consentWhatsApp: false,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-25),
    },

    // --- Cancer Care Cohort ---
    {
      id: "ca_01",
      name: "Radha Patel",
      nameHi: "राधा पटेल",
      age: 47,
      phone: "9826123480",
      village: "Gharonda",
      ashaName: "Shanti Bai",
      ashaPhone: "9827011224",
      status: "HRP", // Screen positive
      service: "CANCER",
      abhaId: "14-7766-5544-11",
      consentWhatsApp: true,
      homeSubcentreId: "SUBCENTRE",
      createdAt: addDays(-18),
    }
  ];

  await db.patients.bulkAdd(seedPatients);

  // Seed visits
  const seedVisits: Visit[] = [
    { id: "vis_01", patientId: "pw_01", facilityId: "SUBCENTRE", recordedByRole: "anm", visitDateTime: addDays(-5), isBackdated: false },
    { id: "vis_02", patientId: "pw_02", facilityId: "SUBCENTRE", recordedByRole: "anm", visitDateTime: addDays(-12), isBackdated: false },
    { id: "vis_03", patientId: "pw_03", facilityId: "SUBCENTRE", recordedByRole: "anm", visitDateTime: addDays(-30), isBackdated: false },
    { id: "vis_04", patientId: "pw_04", facilityId: "SUBCENTRE", recordedByRole: "anm", visitDateTime: addDays(-4), isBackdated: false },
    { id: "vis_05", patientId: "pw_05", facilityId: "SUBCENTRE", recordedByRole: "anm", visitDateTime: addDays(-7), isBackdated: false },
  ];
  await db.visits.bulkAdd(seedVisits);

  // Seed next steps
  const seedSteps: NextStep[] = [
    // Sunita Devi: Upward referral to District Hospital Rewa (Pending arrival at DH!)
    {
      id: "step_01",
      visitId: "vis_01",
      patientId: "pw_01",
      service: "ANC",
      category: "REFERRAL",
      targetFacilityId: "DH",
      targetFacilityName: "District Hospital, Rewa",
      direction: "UPWARD",
      dueDate: addDays(2),
      priority: "URGENT",
      status: "PENDING",
      escalationCount: 0,
      createdAt: addDays(-5),
      createdByRole: "anm",
    },
    // Rekha Kumari: Overdue Tertiary referral with 2 escalations (Derived At-Risk!)
    {
      id: "step_02",
      visitId: "vis_02",
      patientId: "pw_02",
      service: "ANC",
      category: "REFERRAL",
      targetFacilityId: "TERTIARY",
      targetFacilityName: "Medical College, Jabalpur",
      direction: "UPWARD",
      dueDate: addDays(-9),
      priority: "URGENT",
      status: "PENDING",
      escalationCount: 2,
      lastEscalatedAt: addDays(-3),
      createdAt: addDays(-12),
      createdByRole: "anm",
    },
    // Meena Bai: ANC visit Due Today at Sub-centre
    {
      id: "step_03",
      visitId: "vis_03",
      patientId: "pw_03",
      service: "ANC",
      category: "ANC_VISIT",
      targetFacilityId: "SUBCENTRE",
      targetFacilityName: "Sub-centre Ghurehta",
      direction: "DOWNWARD",
      dueDate: todayISO,
      priority: "ROUTINE",
      status: "SCHEDULED",
      escalationCount: 0,
      createdAt: addDays(-30),
      createdByRole: "anm",
    },
    // Pooja Sharma: Ultrasound needed at PHC Sirmour
    {
      id: "step_04",
      visitId: "vis_04",
      patientId: "pw_04",
      service: "ANC",
      category: "IMAGING",
      targetFacilityId: "PHC",
      targetFacilityName: "PHC Sirmour",
      direction: "UPWARD",
      dueDate: addDays(-2),
      priority: "URGENT",
      status: "PENDING",
      escalationCount: 1,
      lastEscalatedAt: addDays(-1),
      createdAt: addDays(-4),
      createdByRole: "anm",
    },
    // Radha Prasad / Gita Sharma: Referral to CHC Teonthar (Expected Arrival at CHC)
    {
      id: "step_05",
      visitId: "vis_05",
      patientId: "pw_05",
      service: "ANC",
      category: "REFERRAL",
      targetFacilityId: "CHC",
      targetFacilityName: "CHC Teonthar",
      direction: "UPWARD",
      dueDate: addDays(4),
      priority: "URGENT",
      status: "PENDING",
      escalationCount: 0,
      createdAt: addDays(-7),
      createdByRole: "anm",
    },

    // --- PNC Next Steps ---
    {
      id: "step_pnc_01",
      visitId: "vis_01",
      patientId: "pnc_01",
      service: "PNC",
      category: "PNC_VISIT",
      targetFacilityId: "SUBCENTRE",
      targetFacilityName: "Sub-centre Ghurehta",
      direction: "DOWNWARD",
      dueDate: todayISO,
      priority: "URGENT",
      status: "SCHEDULED",
      escalationCount: 0,
      createdAt: addDays(-3),
      createdByRole: "anm",
    },
    {
      id: "step_pnc_02",
      visitId: "vis_01",
      patientId: "pnc_01",
      service: "PNC",
      category: "NB_CHECK",
      targetFacilityId: "SUBCENTRE",
      targetFacilityName: "Sub-centre Ghurehta",
      direction: "DOWNWARD",
      dueDate: addDays(2),
      priority: "ROUTINE",
      status: "SCHEDULED",
      escalationCount: 0,
      createdAt: addDays(-3),
      createdByRole: "anm",
    },

    // --- NCD Next Steps ---
    {
      id: "step_ncd_01",
      visitId: "vis_02",
      patientId: "ncd_01",
      service: "NCD",
      category: "REFILL",
      targetFacilityId: "SUBCENTRE",
      targetFacilityName: "Sub-centre Ghurehta",
      direction: "DOWNWARD",
      dueDate: addDays(-3),
      priority: "URGENT",
      status: "PENDING",
      escalationCount: 1,
      lastEscalatedAt: addDays(-1),
      createdAt: addDays(-10),
      createdByRole: "anm",
    },
    {
      id: "step_ncd_02",
      visitId: "vis_02",
      patientId: "ncd_01",
      service: "NCD",
      category: "BP_CHECK",
      targetFacilityId: "SUBCENTRE",
      targetFacilityName: "Sub-centre Ghurehta",
      direction: "DOWNWARD",
      dueDate: todayISO,
      priority: "ROUTINE",
      status: "SCHEDULED",
      escalationCount: 0,
      createdAt: addDays(-7),
      createdByRole: "anm",
    },

    // --- Cancer Next Steps ---
    {
      id: "step_ca_01",
      visitId: "vis_04",
      patientId: "ca_01",
      service: "CANCER",
      category: "REFERRAL",
      targetFacilityId: "DH",
      targetFacilityName: "District Hospital, Rewa · Oncology",
      direction: "UPWARD",
      dueDate: addDays(3),
      priority: "URGENT",
      status: "PENDING",
      escalationCount: 0,
      createdAt: addDays(-5),
      createdByRole: "anm",
    }
  ];
  await db.steps.bulkAdd(seedSteps);

  // Seed escalation alerts
  const seedAlerts: EscalationAlert[] = [
    {
      id: "alt_01",
      stepId: "step_02",
      patientId: "pw_02",
      patientName: "Rekha Kumari",
      patientPhone: "9826123452",
      village: "Gharonda",
      ashaName: "Shanti Bai",
      category: "REFERRAL",
      dueDate: addDays(-9),
      daysOverdue: 9,
      escalationCount: 2,
      assignedRole: "asha",
      acknowledged: false,
      createdAt: addDays(-3),
    },
    {
      id: "alt_02",
      stepId: "step_04",
      patientId: "pw_04",
      patientName: "Pooja Sharma",
      patientPhone: "9826123454",
      village: "Bhanpur",
      ashaName: "Geeta Kol",
      category: "IMAGING",
      dueDate: addDays(-2),
      daysOverdue: 2,
      escalationCount: 1,
      assignedRole: "anm",
      acknowledged: false,
      createdAt: addDays(-1),
    },
  ];
  await db.alerts.bulkAdd(seedAlerts);
}
