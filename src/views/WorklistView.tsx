import React, { useState } from "react";
import { useCoordination } from "../context/CoordinationContext";
import { useAuth } from "../context/AuthContext";
import { NextStep, ActiveDialog } from "../openphc/types";
import { deriveStepState } from "../openphc/protocolRules";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Calendar, 
  User, 
  Check, 
  Search, 
  Phone, 
  Activity, 
  HeartHandshake, 
  CalendarCheck,
  ChevronRight
} from "lucide-react";

interface WorklistViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenDialog?: (dlg: ActiveDialog) => void;
}

export const WorklistView: React.FC<WorklistViewProps> = ({ onSelectPatient, onOpenDialog }) => {
  const { steps, patients } = useCoordination();
  const { role, facility } = useAuth();

  const [activeFilter, setActiveFilter] = useState<"ALL" | "OVERDUE" | "DUE_TODAY" | "UPCOMING">("ALL");
  const [activeScope, setActiveScope] = useState<"MY_SC" | "ALL_SC">("MY_SC");
  const [searchQuery, setSearchQuery] = useState("");

  const patientMap = new Map(patients.map((p) => [p.id, p]));

  // Open steps only
  const openSteps = steps.filter((s) => s.status === "SCHEDULED" || s.status === "PENDING");

  // Counts for chips
  const overdueCount = openSteps.filter((s) => deriveStepState(s).isOverdue).length;
  const dueTodayCount = openSteps.filter((s) => deriveStepState(s).isDueToday).length;
  const upcomingCount = openSteps.filter((s) => !deriveStepState(s).isOverdue && !deriveStepState(s).isDueToday).length;

  // Filter steps
  const filteredSteps = openSteps.filter((s) => {
    const p = patientMap.get(s.patientId);
    if (!p) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q) || (p.nameHi && p.nameHi.includes(q));
      const matchPhone = p.phone.includes(q);
      const matchVillage = p.village.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchVillage) return false;
    }

    // Scope filter
    if (activeScope === "MY_SC") {
      if (p.homeSubcentreId && p.homeSubcentreId !== "SUBCENTRE" && p.homeSubcentreId !== facility.id) {
        // If assigned to another SC
      }
    }

    const state = deriveStepState(s);
    if (activeFilter === "OVERDUE") return state.isOverdue;
    if (activeFilter === "DUE_TODAY") return state.isDueToday;
    if (activeFilter === "UPCOMING") return !state.isOverdue && !state.isDueToday;
    return true;
  });

  const getStepIcon = (category: string) => {
    switch (category) {
      case "REFERRAL":
      case "REF_PW":
      case "REF_NB":
        return { icon: <Building2 size={16} color="#1E14BE" />, bg: "#EFEDFF", color: "#1E14BE" };
      case "ANC_VISIT":
        return { icon: <Calendar size={16} color="#2E9E6B" />, bg: "#E7F6EE", color: "#2E9E6B" };
      case "PMSMA_VISIT":
        return { icon: <CalendarCheck size={16} color="#C35721" />, bg: "#FBEDE4", color: "#C35721" };
      case "IMAGING":
        return { icon: <Activity size={16} color="#188673" />, bg: "#E6F5F2", color: "#188673" };
      case "HOME_VISIT":
      case "HBNC":
        return { icon: <HeartHandshake size={16} color="#6165DE" />, bg: "#F0EFFF", color: "#6165DE" };
      default:
        return { icon: <Clock size={16} color="#994242" />, bg: "#FBEBEB", color: "#994242" };
    }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      overflowY: "auto",
      padding: "14px 16px 32px"
    }}>
      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ml-ink-900)", margin: 0, letterSpacing: "-0.01em" }}>
          Active Worklist
        </h1>
        <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginTop: 2 }}>
          Daily tracking & follow-through tasks
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#FFF",
        border: "1.5px solid #DEDDD8",
        borderRadius: 14,
        padding: "9px 12px",
        marginBottom: 12
      }}>
        <Search size={16} color="var(--ml-ink-400)" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by name, phone, village..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 13,
            fontFamily: "inherit",
            background: "transparent",
            color: "var(--ml-ink-900)"
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ml-ink-400)", fontSize: 12, padding: 0 }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Chips Row (matching prototype) */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 10 }}>
        {[
          { key: "ALL", label: `All (${openSteps.length})` },
          { key: "OVERDUE", label: `Overdue (${overdueCount})`, isAlert: overdueCount > 0 },
          { key: "DUE_TODAY", label: `Due today (${dueTodayCount})` },
          { key: "UPCOMING", label: `Upcoming (${upcomingCount})` },
        ].map((chip) => {
          const isSelected = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key as any)}
              style={{
                flex: "none",
                padding: "7px 14px",
                borderRadius: 999,
                border: isSelected ? "1.5px solid var(--ml-blue)" : "1.5px solid #DEDDD8",
                background: isSelected ? "#EFEDFF" : "#FFF",
                color: isSelected ? "var(--ml-blue)" : chip.isAlert ? "#994242" : "var(--ml-ink-700)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Scope Chips Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ml-ink-400)" }}>
          Scope
        </span>
        {[
          { key: "MY_SC", label: "My SC-HWC (Ghurehta)" },
          { key: "ALL_SC", label: "All 4 SCs (PHC Sirmour)" },
        ].map((sc) => {
          const isSelected = activeScope === sc.key;
          return (
            <button
              key={sc.key}
              onClick={() => setActiveScope(sc.key as any)}
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                border: isSelected ? "1.5px solid var(--ml-ink-700)" : "1px solid #ECEAE4",
                background: isSelected ? "#FAF9F6" : "#FFF",
                color: isSelected ? "var(--ml-ink-900)" : "var(--ml-ink-500)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {sc.label}
            </button>
          );
        })}
      </div>

      {/* Worklist Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredSteps.map((step) => {
          const patient = patientMap.get(step.patientId);
          if (!patient) return null;

          const state = deriveStepState(step);
          const iconInfo = getStepIcon(step.category);

          return (
            <div
              key={step.id}
              style={{
                background: "#FFF",
                border: "1px solid #ECEAE4",
                borderLeft: state.isOverdue ? "4px solid #994242" : `4px solid ${iconInfo.color}`,
                borderRadius: 15,
                padding: "13px 14px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}
            >
              {/* Row 1: Patient Name, Tag, Due Date */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div 
                  onClick={() => onSelectPatient(patient.id)}
                  style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                      {patient.name}
                    </span>
                    {patient.nameHi && (
                      <span style={{ fontSize: 12, color: "var(--ml-ink-400)" }}>{patient.nameHi}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)", marginTop: 2 }}>
                    📍 {patient.village} · ASHA: {patient.ashaName}
                  </div>
                </div>

                <span style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: state.isOverdue ? "#994242" : state.isDueToday ? "#C35721" : "var(--ml-ink-700)",
                  background: state.isOverdue ? "#FBEBEB" : state.isDueToday ? "#FBEDE4" : "#FAF9F6",
                  padding: "3px 8px",
                  borderRadius: 6
                }}>
                  {state.isOverdue ? `${state.daysOverdue}d overdue` : state.isDueToday ? "Due Today" : step.dueDate}
                </span>
              </div>

              {/* Row 2: Step Detail Box */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FAF9F6",
                padding: "8px 10px",
                borderRadius: 10
              }}>
                <span style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: iconInfo.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none"
                }}>
                  {iconInfo.icon}
                </span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "var(--ml-ink-800)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {step.category.replace("_", " ")} {step.targetFacilityName ? `· ${step.targetFacilityName}` : ""}
                </span>
              </div>

              {/* Row 3: Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                <button
                  onClick={() => {
                    if (onOpenDialog) {
                      onOpenDialog({ type: "action_sheet", woman: patient, step });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--ml-blue)",
                    color: "#FFF",
                    border: "none",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5
                  }}
                >
                  <Check size={14} strokeWidth={2.8} />
                  <span>Update Status</span>
                </button>

                <button
                  onClick={() => {
                    if (onOpenDialog) {
                      onOpenDialog({ type: "close_step", woman: patient, step });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "#E7F6EE",
                    color: "#2E9E6B",
                    border: "1px solid #D0EFE0",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>Confirm Arrival</span>
                </button>

                <a
                  href={`tel:${patient.phone}`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "#FAF9F6",
                    border: "1px solid #ECEAE4",
                    color: "var(--ml-ink-700)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none"
                  }}
                >
                  <Phone size={14} />
                </a>
              </div>
            </div>
          );
        })}

        {filteredSteps.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "40px 16px",
            background: "#FFF",
            borderRadius: 16,
            border: "1.5px dashed #DEDDD8",
            color: "var(--ml-ink-500)",
            fontSize: 13.5
          }}>
            No open commitments match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
