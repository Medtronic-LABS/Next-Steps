import React, { useState } from "react";
import { useCoordination } from "../context/CoordinationContext";
import { ActiveDialog } from "../openphc/types";
import { 
  Bell, 
  AlertTriangle, 
  Check, 
  Phone, 
  RefreshCw, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface AlertsViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenDialog?: (dlg: ActiveDialog) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onSelectPatient, onOpenDialog }) => {
  const { alerts, triggerEscalationCheck, acknowledgeAlert, patients } = useCoordination();
  const [evaluating, setEvaluating] = useState(false);

  const patientMap = new Map(patients.map((p) => [p.id, p]));

  const handleRunSLA = async () => {
    setEvaluating(true);
    await triggerEscalationCheck();
    setEvaluating(false);
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
      {/* Title & SLA Sweep */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ml-ink-900)", margin: 0, letterSpacing: "-0.01em" }}>
            Escalation Alerts
          </h1>
          <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginTop: 2 }}>
            Active breaches requiring linked ASHA / ANM follow-up
          </div>
        </div>

        <button
          onClick={handleRunSLA}
          disabled={evaluating}
          title="Run SLA sweep"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 10,
            border: "1px solid #DEDDD8",
            background: "#FFF",
            color: "var(--ml-blue)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          <RefreshCw size={12} className={evaluating ? "animate-spin" : ""} />
          <span>SLA Sweep</span>
        </button>
      </div>

      {/* Principle Banner (BR-019 matching prototype) */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: "#EFEDFF",
        borderRadius: 14,
        marginBottom: 16
      }}>
        <Bell size={18} color="var(--ml-blue)" style={{ flex: "none", marginTop: 2 }} />
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ml-blue)" }}>
          Each alert means <strong>a pregnant woman needs attention</strong> — routed to her own sub-centre. Never a score of anyone's work (BR-019).
        </div>
      </div>

      {/* Alert Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map((alt) => {
          const patient = patientMap.get(alt.patientId);
          const tone = alt.escalationCount >= 2 ? "#994242" : "#C35721";
          const bgSoft = alt.escalationCount >= 2 ? "#FBEBEB" : "#FBEDE4";

          return (
            <div
              key={alt.id}
              style={{
                background: "#FFF",
                border: "1px solid #ECEAE4",
                borderLeft: `4px solid ${tone}`,
                borderRadius: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                padding: "14px 15px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                opacity: alt.acknowledged ? 0.75 : 1
              }}
            >
              {/* Type Badge & Escalation Level */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: tone,
                  background: bgSoft,
                  padding: "3px 8px",
                  borderRadius: 6
                }}>
                  {alt.escalationCount >= 2 ? "High-Risk SLA Breach (>72h)" : "Follow-Through Alert"}
                </span>

                <span style={{ fontSize: 11.5, color: "var(--ml-ink-400)", fontWeight: 600 }}>
                  Escalation #{alt.escalationCount}
                </span>
              </div>

              {/* Patient details */}
              <div>
                <div 
                  onClick={() => onSelectPatient(alt.patientId)}
                  style={{ fontSize: 16, fontWeight: 800, color: "var(--ml-ink-900)", cursor: "pointer" }}
                >
                  {alt.patientName}
                </div>
                <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginTop: 2 }}>
                  📍 {alt.village} · Linked ASHA: <strong>{alt.ashaName}</strong>
                </div>
              </div>

              {/* Due Date & Breach Note */}
              <div style={{
                background: "#FAF9F6",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 12,
                color: "var(--ml-ink-700)"
              }}>
                <strong>{alt.category.replace("_", " ")}</strong> was due on {alt.dueDate}. Exceeded SLA follow-up window by {alt.daysOverdue} days.
              </div>

              {/* Actions Row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                <button
                  onClick={() => onSelectPatient(alt.patientId)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
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
                    gap: 6
                  }}
                >
                  <span>Open Woman Journey</span>
                  <ArrowRight size={14} />
                </button>

                <a
                  href={`tel:${alt.patientPhone}`}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "#E7F6EE",
                    color: "#1B6B47",
                    border: "1px solid #D0EFE0",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none"
                  }}
                >
                  <Phone size={14} />
                  <span>Call ASHA</span>
                </a>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "48px 16px",
            background: "#FFF",
            borderRadius: 16,
            border: "1.5px dashed #DEDDD8",
            color: "var(--ml-ink-500)",
            fontSize: 13.5
          }}>
            No escalation alerts. All pregnant women are within their scheduled follow-through window.
          </div>
        )}
      </div>
    </div>
  );
};
