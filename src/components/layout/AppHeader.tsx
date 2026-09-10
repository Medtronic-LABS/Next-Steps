import React, { useState } from "react";
import { useAuth, ROLE_CONFIGS } from "../../context/AuthContext";
import { useCoordination } from "../../context/CoordinationContext";
import { RoleId, ServiceDomain } from "../../openphc/types";
import { RefreshCw, Radio, ChevronDown, Check, X, Shield, Sparkles, Building2, User } from "lucide-react";

interface AppHeaderProps {
  onOpenDevDrawer: () => void;
  onOpenLauncher: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenDevDrawer, onOpenLauncher }) => {
  const { role, roleConfig, service, setService, loginAs } = useAuth();
  const { outbox, syncOutbox } = useCoordination();

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const queuedCount = outbox.filter((e) => e.status === "QUEUED").length;

  const roleList: Array<{ id: RoleId; short: string; title: string; facility: string; accent: string }> = [
    { id: "asha", short: "ASHA", title: "Village Health Worker", facility: "Village Ghurehta", accent: "#188673" },
    { id: "anm", short: "ANM", title: "Auxiliary Nurse Midwife", facility: "Sub-centre Ghurehta", accent: "#1E14BE" },
    { id: "phc_sn", short: "PHC SN", title: "Staff Nurse (PHC)", facility: "PHC Sirmour", accent: "#C35721" },
    { id: "chc_sn", short: "CHC SN", title: "Staff Nurse (FRU)", facility: "CHC Teonthar", accent: "#994242" },
    { id: "dh_sn", short: "DH SN", title: "District Hospital Nurse", facility: "DH Rewa", accent: "#2E9E6B" },
    { id: "phc_mo", short: "PHC MO", title: "Medical Officer", facility: "PHC Sirmour", accent: "#1E14BE" },
    { id: "dpo", short: "DPO", title: "District Programme Officer", facility: "Rewa District", accent: "#6165DE" },
  ];

  const handleSelectRole = (newRole: RoleId) => {
    loginAs(newRole, service);
    setIsRoleModalOpen(false);
  };

  return (
    <>
      <header style={{
        padding: "10px 14px 8px 14px",
        background: "#FFFFFF",
        borderBottom: "1px solid #ECEAE4",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 30,
        boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
        flexShrink: 0
      }}>
        {/* Top row: Brand + Role Pill + Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "nowrap" }}>
          {/* Left: Brand and clickable Role Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexShrink: 1 }}>
            <div 
              onClick={onOpenLauncher}
              style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--ml-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
                fontWeight: 800,
                fontSize: 12
              }}>
                NS
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ml-ink-900)", letterSpacing: "-0.01em" }}>
                Next Steps
              </span>
            </div>

            {/* Role Pill - tap to open quick persona switcher */}
            <button
              onClick={() => setIsRoleModalOpen(true)}
              title="Switch User Role or Facility"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 7px",
                borderRadius: 12,
                background: "#F4F3EE",
                border: "1px solid #E6E4DC",
                cursor: "pointer",
                fontSize: 11,
                minWidth: 0,
                flexShrink: 1
              }}
            >
              <span style={{
                background: roleConfig.accent,
                color: "#FFF",
                padding: "1px 4px",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 800,
                flexShrink: 0
              }}>
                {roleConfig.short}
              </span>
              <span style={{
                fontWeight: 600,
                color: "var(--ml-ink-800)",
                maxWidth: 82,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 10.5
              }}>
                {roleConfig.facility.replace("Sub-centre ", "SC ").replace("District Hospital, ", "DH ").replace("Village ", "")}
              </span>
              <ChevronDown size={11} color="var(--ml-ink-500)" style={{ flexShrink: 0 }} />
            </button>
          </div>

          {/* Right: Sync Status & CCE Trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => syncOutbox()}
              title="OpenPHC Outbox Sync Status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "4px 7px",
                borderRadius: 10,
                fontSize: 10.5,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: queuedCount > 0 ? "#FDF0E8" : "#EBF9F2",
                color: queuedCount > 0 ? "#C35721" : "#2E9E6B",
                transition: "all 0.15s",
                whiteSpace: "nowrap"
              }}
            >
              <RefreshCw size={10.5} className={queuedCount > 0 ? "animate-spin" : ""} />
              <span>{queuedCount > 0 ? `${queuedCount}` : "Synced"}</span>
            </button>

            <button
              onClick={onOpenDevDrawer}
              title="OpenPHC Care Coordination Engine Inspector"
              style={{
                padding: "4px 7px",
                borderRadius: 8,
                border: "1px solid #C8C4F8",
                background: "#EFEDFF",
                color: "var(--ml-blue)",
                fontSize: 10,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
                boxShadow: "0 1px 3px rgba(30,20,190,0.08)",
                whiteSpace: "nowrap"
              }}
            >
              <Radio size={11} />
              <span>Cockpit</span>
            </button>
          </div>
        </div>

        {/* Second row: Slim Domain Switcher */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#F8F7F4",
          padding: "2px 4px",
          borderRadius: 10,
          gap: 2,
          flexShrink: 0
        }}>
          {(["ANC", "PNC", "NCD", "CANCER"] as const).map((svc) => (
            <button
              key={svc}
              onClick={() => setService(svc)}
              style={{
                flex: 1,
                border: "none",
                padding: "5px 0",
                borderRadius: 8,
                fontSize: 10.5,
                fontWeight: service === svc ? 800 : 600,
                background: service === svc ? "#FFFFFF" : "transparent",
                color: service === svc ? "var(--ml-blue)" : "var(--ml-ink-600)",
                boxShadow: service === svc ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
                transition: "all 0.12s",
                textAlign: "center"
              }}
            >
              {svc === "CANCER" ? "CANCER" : svc}
            </button>
          ))}
        </div>
      </header>

      {/* Quick Role Switcher Modal (Contained inside device screen) */}
      {isRoleModalOpen && (
        <div 
          onClick={() => setIsRoleModalOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 90,
            display: "flex",
            alignItems: "flex-end",
            animation: "fadeIn 0.15s ease"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-slide-up"
            style={{
              width: "100%",
              maxHeight: "80vh",
              background: "#FFFFFF",
              borderRadius: "24px 24px 0 0",
              padding: "16px 18px 28px 18px",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto"
            }}
          >
            {/* Drag bar */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 4px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                  Switch Frontline Role
                </div>
                <div style={{ fontSize: 12, color: "var(--ml-ink-500)" }}>
                  Test coordination between village, SC, PHC, CHC, and DH
                </div>
              </div>

              <button
                onClick={() => setIsRoleModalOpen(false)}
                style={{
                  background: "#F4F3EE",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={15} color="var(--ml-ink-600)" />
              </button>
            </div>

            {/* Role options list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roleList.map((r) => {
                const isCurrent = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: isCurrent ? `2px solid ${r.accent}` : "1px solid #ECEAE4",
                      background: isCurrent ? `${r.accent}10` : "#FAFAF7",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    <span style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: r.accent,
                      color: "#FFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {r.short}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ml-ink-900)" }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)", marginTop: 1 }}>
                        📍 {r.facility}
                      </div>
                    </div>

                    {isCurrent && <Check size={16} color={r.accent} />}
                  </button>
                );
              })}
            </div>

            {/* Link to Full Splash Launcher */}
            <div style={{ borderTop: "1px solid #ECEAE4", paddingTop: 10, display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setIsRoleModalOpen(false);
                  onOpenLauncher();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ml-blue)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <span>Open Full Domain Setup & Launcher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
