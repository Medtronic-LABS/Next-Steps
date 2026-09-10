import React from "react";
import { useCoordination } from "../context/CoordinationContext";
import { deriveStepState } from "../openphc/protocolRules";
import { ActiveDialog, NextStep } from "../openphc/types";
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Building2, 
  Calendar, 
  Activity, 
  HeartHandshake, 
  ChevronRight,
  Check,
  CalendarCheck
} from "lucide-react";

interface JourneyViewProps {
  onBack: () => void;
  onGoToCapture: () => void;
  onOpenDialog: (dlg: ActiveDialog) => void;
}

export const JourneyView: React.FC<JourneyViewProps> = ({ onBack, onGoToCapture, onOpenDialog }) => {
  const { activePatient, steps } = useCoordination();

  if (!activePatient) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
        <p>No patient selected.</p>
        <button 
          onClick={onBack}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            background: "var(--ml-blue)",
            color: "#FFF",
            border: "none",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const patientSteps = steps.filter((s) => s.patientId === activePatient.id);
  const openSteps = patientSteps.filter((s) => s.status === "SCHEDULED" || s.status === "PENDING");
  const closedSteps = patientSteps.filter((s) => s.status === "COMPLETED" || s.status === "DECLINED");

  const initials = activePatient.name
    ? activePatient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "PW";

  // Visual categorization helper
  const getStepVisuals = (step: NextStep) => {
    switch (step.category) {
      case "REFERRAL":
      case "REF_PW":
      case "REF_NB":
        return {
          ac: "#1E14BE",
          sf: "#EFEDFF",
          icon: <Building2 size={18} color="#1E14BE" />,
          title: step.targetFacilityName || "Specialist Referral",
        };
      case "ANC_VISIT":
        return {
          ac: "#2E9E6B",
          sf: "#E7F6EE",
          icon: <Calendar size={18} color="#2E9E6B" />,
          title: "ANC Routine Check-up",
        };
      case "PMSMA_VISIT":
        return {
          ac: "#C35721",
          sf: "#FBEDE4",
          icon: <CalendarCheck size={18} color="#C35721" />,
          title: "PMSMA Special Session (9th)",
        };
      case "IMAGING":
        return {
          ac: "#188673",
          sf: "#E6F5F2",
          icon: <Activity size={18} color="#188673" />,
          title: "Obstetric USG Scan",
        };
      case "HOME_VISIT":
      case "HBNC":
        return {
          ac: "#6165DE",
          sf: "#F0EFFF",
          icon: <HeartHandshake size={18} color="#6165DE" />,
          title: "ASHA Home Care / HBNC Visit",
        };
      case "LAB":
      case "BP_CHECK":
      case "SUGAR_TEST":
        return {
          ac: "#994242",
          sf: "#FBEBEB",
          icon: <Activity size={18} color="#994242" />,
          title: step.detailText || "Laboratory Diagnostics",
        };
      default:
        return {
          ac: "#1E14BE",
          sf: "#EFEDFF",
          icon: <FileText size={18} color="#1E14BE" />,
          title: step.detailText || "Next Step Commitment",
        };
    }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      overflowY: "auto",
      padding: "0 0 32px"
    }}>
      {/* Blue Patient Hero Banner (matching Medtronic LABS prototype) */}
      <div style={{
        background: "var(--ml-blue)",
        padding: "14px 16px 16px",
        position: "relative",
        overflow: "hidden",
        color: "#FFF"
      }}>
        {/* Header Back Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.14)",
              border: "none",
              color: "#FFF",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "5px 11px",
              borderRadius: 10
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>

          <span style={{
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(84, 204, 144, 0.22)",
            color: "#A2F0C6",
            padding: "4px 9px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 4
          }}>
            <Check size={12} strokeWidth={3} /> SMS reminders on
          </span>
        </div>

        {/* Patient Profile Row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{
            flex: "none",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "0.02em"
          }}>
            {initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#FFF", letterSpacing: "-0.01em" }}>
                {activePatient.name}
              </span>
              {activePatient.nameHi && (
                <span style={{ fontSize: 13.5, color: "#D7D4FA" }}>{activePatient.nameHi}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#B6B1EE", marginTop: 2 }}>
              {activePatient.age || 23}y · 📍 {activePatient.village} · ABHA {activePatient.abhaId || "91-8234-1123-9081"}
            </div>
          </div>
        </div>

        {/* Gestation, Risk and Call Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{
            display: "flex",
            alignItems: "center",
            padding: "5px 4px",
            borderRadius: 9,
            background: "rgba(255,255,255,0.15)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#FFF"
          }}>
            <span style={{ padding: "0 8px" }}>28w 4d</span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.25)" }}></span>
            <span style={{ padding: "0 8px", display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#D7D4FA" }}>EDD</span>
              <span>14 Nov</span>
            </span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.25)" }}></span>
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              margin: "0 3px",
              padding: "2px 8px",
              borderRadius: 6,
              background: activePatient.status === "HRP" ? "#994242" : "#2E9E6B",
              color: "#FFF",
              fontSize: 11,
              fontWeight: 800
            }}>
              {activePatient.status === "HRP" ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
              {activePatient.status === "HRP" ? (activePatient.riskReason || "HRP") : "Normal"}
            </span>
          </span>

          <a
            href={`tel:${activePatient.phone}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px 5px 6px",
              border: "none",
              borderRadius: 9,
              background: "rgba(255,255,255,0.2)",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#FFF",
              textDecoration: "none"
            }}
          >
            <span style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "#54CC90",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0E3D28"
            }}>
              <Phone size={13} strokeWidth={2.6} />
            </span>
            <span>{activePatient.phone}</span>
          </a>
        </div>
      </div>

      {/* Primary Action Button: Enter Next Steps */}
      <div style={{ padding: "14px 16px 0" }}>
        <button
          onClick={onGoToCapture}
          style={{
            width: "100%",
            padding: "13px",
            border: "none",
            borderRadius: 14,
            background: "var(--ml-blue)",
            color: "#FFF",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(30,20,190,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          <Plus size={18} strokeWidth={2.6} />
          <span>Enter Next Steps</span>
        </button>
      </div>

      {/* Secondary Action: Primary Health Profile Card */}
      <div style={{ padding: "10px 16px 0" }}>
        <button
          onClick={() => onOpenDialog({ type: "profile", woman: activePatient })}
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1.5px solid #DEDDD8",
            borderRadius: 14,
            background: "#FFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 11,
            textAlign: "left"
          }}
        >
          <span style={{
            flex: "none",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#EFEDFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ml-blue)"
          }}>
            <FileText size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>
              Primary health profile
            </span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--ml-ink-500)", marginTop: 1 }}>
              ANC → PNC → NCD · one continuum
            </span>
          </span>
          <ChevronRight size={18} color="var(--ml-blue)" />
        </button>
      </div>

      {/* Section Header: Open Next Steps */}
      <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ml-ink-500)" }}>
          Open next steps · {openSteps.length}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)" }}>
          Tap to update
        </div>
      </div>

      {/* Open Steps List */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 9 }}>
        {openSteps.map((step) => {
          const state = deriveStepState(step);
          const visuals = getStepVisuals(step);

          return (
            <div
              key={step.id}
              onClick={() => onOpenDialog({ type: "action_sheet", woman: activePatient, step })}
              style={{
                textAlign: "left",
                width: "100%",
                padding: "12px 13px",
                background: "#FFF",
                border: "1px solid #ECEAE4",
                borderLeft: `4px solid ${visuals.ac}`,
                borderRadius: 14,
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12
              }}
            >
              <span style={{
                flex: "none",
                width: 38,
                height: 38,
                borderRadius: 11,
                background: visuals.sf,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {visuals.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.2 }}>
                  {visuals.title}
                </span>
                <span style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: state.isOverdue ? "#994242" : "var(--ml-ink-500)",
                  marginTop: 3
                }}>
                  {state.isOverdue ? `${state.daysOverdue}d overdue` : `Due: ${step.dueDate}`}
                </span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDialog({ type: "action_sheet", woman: activePatient, step });
                }}
                style={{
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  color: "var(--ml-blue)",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Update
                <ChevronRight size={15} strokeWidth={2.4} />
              </button>
            </div>
          );
        })}

        {openSteps.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "20px 20px",
            border: "1px dashed #DEDDD8",
            borderRadius: 14,
            background: "#FFF",
            color: "var(--ml-ink-500)"
          }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ml-ink-700)" }}>No open steps</span>
            <span style={{ fontSize: 12.5 }}> · her journey is up to date</span>
          </div>
        )}
      </div>

      {/* Completed Care History Section */}
      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ml-ink-500)", marginBottom: 8 }}>
          Completed · {closedSteps.length}
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: "#ECEAE4",
          border: "1px solid #ECEAE4",
          borderRadius: 14,
          overflow: "hidden"
        }}>
          {closedSteps.map((step) => {
            const isDowngraded = step.trackingOutcome === "COMPLETED_PRIVATE" || step.completionLocation === "PRIVATE_FACILITY" || step.status === "DECLINED";

            return (
              <div key={step.id} style={{ background: "#FFF", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{
                    flex: "none",
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: "#E7F6EE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1B6B47"
                  }}>
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <span style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ml-ink-900)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {step.category.replace("_", " ")} ({step.targetFacilityName || "Public Facility"})
                  </span>
                  <span style={{ flex: "none", fontSize: 11, color: "var(--ml-ink-500)" }}>
                    {step.closedAt ? step.closedAt.split("T")[0] : "Closed"}
                  </span>
                </div>

                {isDowngraded && (
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    margin: "7px 0 2px 33px",
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: "#F7E3E3",
                    border: "1px solid #E0B4B4"
                  }}>
                    <AlertTriangle size={13} color="#994242" style={{ flex: "none", marginTop: 1 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#994242", lineHeight: 1.35 }}>
                      Attribution: Visited private clinic. Specialist USG scan missing from public record.
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {closedSteps.length === 0 && (
            <div style={{ background: "#FFF", padding: 14, textAlign: "center", fontSize: 12.5, color: "var(--ml-ink-400)" }}>
              Nothing completed yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
