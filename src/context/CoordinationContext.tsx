import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, seedDatabaseIfEmpty, FACILITIES } from "../db";
import { EscalationAlert, NextStep, OutboxEvent, Patient, StepCategory, StepHistory, TrackingOutcomeType, Visit } from "../openphc/types";
import { buildCloudEvent } from "../openphc/eventBuilder";
import { outboxManager } from "../openphc/outboxManager";
import { deriveStepState, shouldEscalate } from "../openphc/protocolRules";
import { useAuth } from "./AuthContext";

interface CreateStepInput {
  category: StepCategory;
  targetFacilityId?: string;
  dueDate: string;
  priority: "ROUTINE" | "URGENT";
  detailText?: string;
}

interface CoordinationContextType {
  patients: Patient[];
  steps: NextStep[];
  allPatients: Patient[];
  allSteps: NextStep[];
  alerts: EscalationAlert[];
  outbox: OutboxEvent[];
  activePatient: Patient | null;
  setActivePatient: (p: Patient | null) => void;
  registerPatient: (input: Omit<Patient, "id" | "createdAt">) => Promise<Patient>;
  createNextSteps: (patientId: string, steps: CreateStepInput[]) => Promise<void>;
  confirmArrival: (stepId: string) => Promise<void>;
  recordTrackingOutcome: (stepId: string, outcome: TrackingOutcomeType, note?: string) => Promise<void>;
  rescheduleStep: (stepId: string, newDate: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  syncOutbox: () => Promise<{ sent: number; failed: number }>;
  triggerEscalationCheck: () => Promise<number>;
  stepHistory: StepHistory[];
}

const CoordinationContext = createContext<CoordinationContextType | undefined>(undefined);

export const CoordinationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { role, facility, service } = useAuth();
  const [activePatient, setActivePatient] = useState<Patient | null>(null);

  // Initialize seed data on load
  useEffect(() => {
    seedDatabaseIfEmpty();
  }, []);

  // Reactive live queries from IndexedDB (AP-1, AP-2)
  const allPatients = useLiveQuery(() => db.patients.toArray()) || [];
  const allSteps = useLiveQuery(() => db.steps.toArray()) || [];
  const patients = useLiveQuery(() => db.patients.where("service").equals(service).toArray(), [service]) || [];
  const steps = useLiveQuery(() => db.steps.where("service").equals(service).toArray(), [service]) || [];
  const alerts = useLiveQuery(() => db.alerts.toArray()) || [];
  const outbox = useLiveQuery(() => db.outbox.orderBy("createdAt").reverse().toArray()) || [];
  const stepHistory = useLiveQuery(() => db.history.orderBy("at").reverse().toArray()) || [];

  const registerPatient = async (input: Omit<Patient, "id" | "createdAt">): Promise<Patient> => {
    const id = `pw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPatient: Patient = {
      ...input,
      id,
      createdAt: new Date().toISOString().split("T")[0],
    };

    await db.patients.add(newPatient);
    setActivePatient(newPatient);
    return newPatient;
  };

  const createNextSteps = async (patientId: string, stepInputs: CreateStepInput[]): Promise<void> => {
    const patient = await db.patients.get(patientId);
    if (!patient) throw new Error("Patient not found");

    const now = new Date();
    const visitId = `vis_${now.getTime()}`;
    
    // 1) Persist encounter Visit (BR-006)
    const visit: Visit = {
      id: visitId,
      patientId,
      facilityId: facility.id,
      recordedByRole: role,
      visitDateTime: now.toISOString(),
      isBackdated: false,
    };
    await db.visits.add(visit);

    // 2) Persist Next Steps & emit OpenPHC CloudEvents
    for (const input of stepInputs) {
      const stepId = `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const targetFac = FACILITIES.find((f) => f.id === input.targetFacilityId);
      
      const newStep: NextStep = {
        id: stepId,
        visitId,
        patientId,
        service: patient.service,
        category: input.category,
        targetFacilityId: input.targetFacilityId,
        targetFacilityName: targetFac ? targetFac.name : undefined,
        direction: input.category === "REFERRAL" ? "UPWARD" : undefined,
        dueDate: input.dueDate,
        priority: input.priority,
        status: input.category === "REFERRAL" ? "PENDING" : "SCHEDULED",
        detailText: input.detailText,
        escalationCount: 0,
        createdAt: now.toISOString(),
        createdByRole: role,
      };

      await db.steps.add(newStep);

      // Append immutable history (AP-1, §11.4)
      await db.history.add({
        id: `hist_${Date.now()}`,
        stepId,
        at: now.toISOString(),
        byRole: role,
        fromStatus: "SCHEDULED",
        toStatus: newStep.status,
      });

      // Emit CloudEvent with FHIR Task payload to Outbox (AP-6, UC-23)
      const cloudEvent = buildCloudEvent(newStep, patient, "org.openphc.task.created", facility.id);
      await outboxManager.queueEvent(stepId, "org.openphc.task.created", cloudEvent);
    }
  };

  const confirmArrival = async (stepId: string): Promise<void> => {
    const step = await db.steps.get(stepId);
    if (!step) return;

    const patient = await db.patients.get(step.patientId);
    if (!patient) return;

    const now = new Date();
    
    // Update step to COMPLETED with FACILITY_CONFIRMED (NS-5, NS-6)
    const updatedStep: NextStep = {
      ...step,
      status: "COMPLETED",
      attribution: "FACILITY_CONFIRMED",
      completionLocation: "REFERRED_PUBLIC_FACILITY",
      closedAt: now.toISOString(),
      closedByRole: role,
      closedAtFacilityId: facility.id,
    };

    await db.steps.put(updatedStep);

    // Append history
    await db.history.add({
      id: `hist_${Date.now()}`,
      stepId,
      at: now.toISOString(),
      byRole: role,
      fromStatus: step.status,
      toStatus: "COMPLETED",
      attribution: "FACILITY_CONFIRMED",
    });

    // Emit CloudEvent to OpenPHC
    const cloudEvent = buildCloudEvent(updatedStep, patient, "org.openphc.task.completed", facility.id);
    await outboxManager.queueEvent(stepId, "org.openphc.task.completed", cloudEvent);
  };

  const recordTrackingOutcome = async (stepId: string, outcome: TrackingOutcomeType, note?: string): Promise<void> => {
    const step = await db.steps.get(stepId);
    if (!step) return;

    const patient = await db.patients.get(step.patientId);
    if (!patient) return;

    const now = new Date();

    if (outcome === "COMPLETED_REFERRED_PUBLIC" || outcome === "COMPLETED_OTHER_PUBLIC" || outcome === "COMPLETED_PRIVATE") {
      const location = 
        outcome === "COMPLETED_PRIVATE" ? "PRIVATE_FACILITY" :
        outcome === "COMPLETED_OTHER_PUBLIC" ? "OTHER_PUBLIC" : "REFERRED_PUBLIC_FACILITY";

      const updatedStep: NextStep = {
        ...step,
        status: "COMPLETED",
        attribution: "REPORTED",
        completionLocation: location,
        trackingOutcome: outcome,
        closedAt: now.toISOString(),
        closedByRole: role,
      };

      await db.steps.put(updatedStep);

      await db.history.add({
        id: `hist_${Date.now()}`,
        stepId,
        at: now.toISOString(),
        byRole: role,
        fromStatus: step.status,
        toStatus: "COMPLETED",
        attribution: "REPORTED",
        reason: outcome,
      });

      // NS-15: If resolved privately, create a "Discovery Commitment" so the patient never vanishes
      if (outcome === "COMPLETED_PRIVATE") {
        const discoveryDueDate = new Date(now);
        discoveryDueDate.setDate(discoveryDueDate.getDate() + 14);

        const discoveryStep: NextStep = {
          id: `step_disc_${Date.now()}`,
          visitId: step.visitId,
          patientId: patient.id,
          service: patient.service,
          category: "FOLLOW_UP",
          targetFacilityId: "SUBCENTRE",
          targetFacilityName: "Sub-centre Ghurehta",
          dueDate: discoveryDueDate.toISOString().split("T")[0],
          priority: "ROUTINE",
          status: "SCHEDULED",
          detailText: "Discovery follow-up: verify private treatment progress (NS-15)",
          escalationCount: 0,
          createdAt: now.toISOString(),
          createdByRole: role,
        };
        await db.steps.add(discoveryStep);
      }

      const cloudEvent = buildCloudEvent(updatedStep, patient, "org.openphc.task.completed", facility.id);
      await outboxManager.queueEvent(stepId, "org.openphc.task.completed", cloudEvent);

    } else if (outcome === "PLAN_TO_GO_LATER") {
      // NS-8: Resets clock anchor, escalation count remains
      const resetAnchor = now.toISOString().split("T")[0];
      await db.steps.update(stepId, {
        escalationClockAnchor: resetAnchor,
        trackingOutcome: outcome,
      });

      await db.history.add({
        id: `hist_${Date.now()}`,
        stepId,
        at: now.toISOString(),
        byRole: role,
        fromStatus: step.status,
        toStatus: step.status,
        reason: "Patient plans to go later - escalation clock anchor reset",
      });

    } else if (outcome === "DOES_NOT_WANT_TO_GO") {
      // NS-9: Declines care -> qualifies for lost-to-follow
      await db.steps.update(stepId, {
        status: "DECLINED",
        trackingOutcome: outcome,
        closedAt: now.toISOString(),
        closedByRole: role,
      });

      await db.history.add({
        id: `hist_${Date.now()}`,
        stepId,
        at: now.toISOString(),
        byRole: role,
        fromStatus: step.status,
        toStatus: "DECLINED",
        reason: "Patient declined recommended care",
      });
    }
  };

  const rescheduleStep = async (stepId: string, newDate: string): Promise<void> => {
    const step = await db.steps.get(stepId);
    if (!step) return;

    const now = new Date();
    await db.steps.update(stepId, {
      dueDate: newDate,
      escalationClockAnchor: newDate,
    });

    await db.history.add({
      id: `hist_${Date.now()}`,
      stepId,
      at: now.toISOString(),
      byRole: role,
      fromStatus: step.status,
      toStatus: step.status,
      reason: `Rescheduled to ${newDate}`,
    });
  };

  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    await db.alerts.update(alertId, { acknowledged: true });
  };

  const syncOutbox = async () => {
    return await outboxManager.attemptSync();
  };

  const triggerEscalationCheck = async (): Promise<number> => {
    const allSteps = await db.steps.toArray();
    let escalatedCount = 0;

    for (const s of allSteps) {
      if (shouldEscalate(s)) {
        const newCount = s.escalationCount + 1;
        await db.steps.update(s.id, {
          escalationCount: newCount,
          lastEscalatedAt: new Date().toISOString(),
        });

        const p = await db.patients.get(s.patientId);
        if (p) {
          const alertId = `alt_${Date.now()}_${s.id}`;
          await db.alerts.put({
            id: alertId,
            stepId: s.id,
            patientId: p.id,
            patientName: p.name,
            patientPhone: p.phone,
            village: p.village,
            ashaName: p.ashaName,
            category: s.category,
            dueDate: s.dueDate,
            daysOverdue: deriveStepState(s).daysOverdue,
            escalationCount: newCount,
            assignedRole: "asha",
            acknowledged: false,
            createdAt: new Date().toISOString(),
          });
        }
        escalatedCount++;
      }
    }
    return escalatedCount;
  };

  return (
    <CoordinationContext.Provider
      value={{
        patients,
        steps,
        allPatients,
        allSteps,
        alerts,
        outbox,
        activePatient,
        setActivePatient,
        registerPatient,
        createNextSteps,
        confirmArrival,
        recordTrackingOutcome,
        rescheduleStep,
        acknowledgeAlert,
        syncOutbox,
        triggerEscalationCheck,
        stepHistory,
      }}
    >
      {children}
    </CoordinationContext.Provider>
  );
};

export const useCoordination = (): CoordinationContextType => {
  const ctx = useContext(CoordinationContext);
  if (!ctx) throw new Error("useCoordination must be used within a CoordinationProvider");
  return ctx;
};
