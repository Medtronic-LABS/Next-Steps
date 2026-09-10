import React from "react";
import { useCoordination } from "../context/CoordinationContext";
import { useAuth } from "../context/AuthContext";
import { ServiceDomain } from "../openphc/types";
import { deriveStepState } from "../openphc/protocolRules";
import { 
  Heart, 
  Baby, 
  Activity, 
  ShieldAlert, 
  ChevronRight, 
  Search, 
  UserPlus, 
  QrCode,
  BarChart3
} from "lucide-react";

interface HomeViewProps {
  onSelectService: (service: ServiceDomain) => void;
  onGoToWorklist: () => void;
  onGoToLookup: () => void;
  onGoToRegister: () => void;
  onGoToInsights: () => void;
  onScanQR: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectService,
  onGoToWorklist,
  onGoToLookup,
  onGoToRegister,
  onGoToInsights,
  onScanQR,
}) => {
  const { allSteps, allPatients } = useCoordination();
  const { roleConfig, service, setService } = useAuth();

  // Compute counts per service across entire database
  const getServiceStats = (svc: ServiceDomain) => {
    const list = allSteps || [];
    const svcSteps = list.filter((s) => s.service === svc && (s.status === "SCHEDULED" || s.status === "PENDING"));
    const openCount = svcSteps.length;
    const dueTodayCount = svcSteps.filter((s) => deriveStepState(s).isDueToday).length;
    const overdueCount = svcSteps.filter((s) => deriveStepState(s).isOverdue).length;
    const peopleCount = (allPatients || []).filter((p) => p.service === svc).length;
    return { openCount, dueTodayCount, overdueCount, peopleCount };
  };

  const folders: Array<{
    key: ServiceDomain;
    label: string;
    full: string;
    line: string;
    ac: string;
    sf: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "ANC",
      label: "ANC",
      full: "Antenatal care",
      line: "ANC visits, PMSMA, referrals",
      ac: "#1E14BE",
      sf: "#EFEDFF",
      icon: <Heart size={24} />,
    },
    {
      key: "PNC",
      label: "PNC & Newborn",
      full: "Postnatal & newborn care",
      line: "PNC visits, follow-up, referrals",
      ac: "#2E9E6B",
      sf: "#D9F7E8",
      icon: <Baby size={24} />,
    },
    {
      key: "NCD",
      label: "NCD",
      full: "Diabetes & hypertension",
      line: "Follow-up, refills, lab tests",
      ac: "#C35721",
      sf: "#FBE7DC",
      icon: <Activity size={24} />,
    },
    {
      key: "CANCER",
      label: "Cancer",
      full: "Cancer screening & care",
      line: "Confirmation, treatment, follow-up",
      ac: "#994242",
      sf: "#F6EBEB",
      icon: <ShieldAlert size={24} />,
    },
  ];

  const handlePickFolder = (svc: ServiceDomain) => {
    setService(svc);
    onSelectService(svc);
    onGoToWorklist();
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      overflowY: "auto",
      padding: "18px 16px 84px 16px",
      gap: 18
    }}>
      {/* Top Banner Header */}
      <div>
        <h2 style={{
          fontSize: 24,
          lineHeight: 1.12,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-strong)",
          margin: "0 0 5px"
        }}>
          Which service today?
        </h2>
        <p style={{
          fontSize: 13,
          color: "var(--text-muted)",
          margin: 0,
          lineHeight: 1.45
        }}>
          Pick a care register. Next steps are tracked per service.
        </p>
      </div>

      {/* Quick Utility Strip */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onGoToLookup}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 12px",
            background: "#FFFFFF",
            border: "1px solid #ECEAE4",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ml-ink-800)",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          <Search size={14} color="var(--ml-blue)" />
          <span>Find Client</span>
        </button>

        <button
          onClick={onScanQR}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 12px",
            background: "#FFFFFF",
            border: "1px solid #ECEAE4",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ml-ink-800)",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          <QrCode size={14} color="var(--ml-blue)" />
          <span>Scan ABHA</span>
        </button>

        <button
          onClick={onGoToRegister}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 12px",
            background: "var(--ml-blue)",
            border: "none",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            color: "#FFF",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(30,20,190,0.18)"
          }}
        >
          <UserPlus size={14} />
          <span>+ Register</span>
        </button>
      </div>

      {/* 4 Physical Service Folder Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {folders.map((f) => {
          const stats = getServiceStats(f.key);
          const isSelected = service === f.key;

          return (
            <div key={f.key} style={{ position: "relative", paddingTop: 9 }}>
              {/* Top physical folder tab */}
              <span style={{
                position: "absolute",
                top: 0,
                left: 16,
                width: 72,
                height: 14,
                borderRadius: "7px 7px 0 0",
                background: f.ac,
                opacity: isSelected ? 1 : 0.85
              }} />

              {/* Main folder card body */}
              <button
                onClick={() => handlePickFolder(f.key)}
                style={{
                  position: "relative",
                  width: "100%",
                  textAlign: "left",
                  padding: 14,
                  border: isSelected ? `2px solid ${f.ac}` : "1px solid #ECEAE4",
                  borderTop: `3.5px solid ${f.ac}`,
                  borderRadius: "4px 18px 18px 18px",
                  background: "#FFFFFF",
                  boxShadow: isSelected ? "0 4px 14px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "transform 0.12s, box-shadow 0.12s"
                }}
              >
                {/* Header: Icon + Title + Chevron */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    flex: "none",
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    background: f.sf,
                    color: f.ac,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {f.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 17.5,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "var(--text-strong)"
                    }}>
                      {f.label}
                    </div>
                    <div style={{
                      fontSize: 12.5,
                      color: "var(--text-muted)",
                      marginTop: 1
                    }}>
                      {f.full}
                    </div>
                  </div>

                  <ChevronRight size={22} color="var(--ml-blue)" style={{ flex: "none" }} />
                </div>

                {/* 3 Metric Summary Boxes */}
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Open Count */}
                  <div style={{
                    flex: 1,
                    background: "var(--surface-page)",
                    borderRadius: 12,
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: "var(--text-strong)" }}>
                      {stats.openCount}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Open
                    </span>
                  </div>

                  {/* Due Today Count */}
                  <div style={{
                    flex: 1,
                    background: "var(--surface-page)",
                    borderRadius: 12,
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1
                  }}>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: stats.dueTodayCount > 0 ? "#166534" : "var(--text-strong)"
                    }}>
                      {stats.dueTodayCount}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Due today
                    </span>
                  </div>

                  {/* Overdue Count */}
                  <div style={{
                    flex: 1,
                    background: "var(--surface-page)",
                    borderRadius: 12,
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1
                  }}>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: stats.overdueCount > 0 ? "#C53B27" : "var(--text-strong)"
                    }}>
                      {stats.overdueCount}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      Overdue
                    </span>
                  </div>
                </div>

                {/* Subtitle Footnote */}
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {f.line} · {stats.peopleCount} enrolled
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Supervisory MO Link Card */}
      <div
        onClick={onGoToInsights}
        style={{
          background: "#FFFFFF",
          border: "1px solid #ECEAE4",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "#EFEDFF",
          color: "#1E14BE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <BarChart3 size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>
            PHC Supervisory Insights
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)" }}>
            Woman-wise cascade drop-offs & OpenPHC AI Q&A
          </div>
        </div>
        <ChevronRight size={18} color="var(--ml-ink-400)" />
      </div>
    </div>
  );
};
