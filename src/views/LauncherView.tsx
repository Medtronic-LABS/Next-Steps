import React, { useState } from "react";
import { useAuth, ROLE_CONFIGS } from "../context/AuthContext";
import { RoleId, ServiceDomain } from "../openphc/types";
import { ChevronRight, ArrowLeft, Layers, ShieldCheck, Heart, Baby, Activity, AlertCircle } from "lucide-react";

interface LauncherViewProps {
  onEnterApp: () => void;
}

export const LauncherView: React.FC<LauncherViewProps> = ({ onEnterApp }) => {
  const { loginAs } = useAuth();
  const [folder, setFolder] = useState<"capture" | "insights">("capture");
  const [selectedService, setSelectedService] = useState<ServiceDomain | null>(null);

  const services = [
    {
      key: "ANC" as ServiceDomain,
      name: "ANC (Pregnancy)",
      hindi: "गर्भावस्था की देखभाल",
      sub: "Pregnancy · ANC visits, PMSMA on the 9th, specialist referrals",
      accent: "#1E14BE",
      icon: <Heart size={24} color="#FFF" />,
    },
    {
      key: "PNC" as ServiceDomain,
      name: "PNC & Newborn",
      hindi: "प्रसव के बाद और नवजात",
      sub: "Mother & baby followed together after delivery",
      accent: "#2E9E6B",
      icon: <Baby size={24} color="#FFF" />,
    },
    {
      key: "NCD" as ServiceDomain,
      name: "NCDs",
      hindi: "मधुमेह व रक्तचाप",
      sub: "Diabetes & hypertension · Follow-up, refills, lab tests",
      accent: "#C35721",
      icon: <Activity size={24} color="#FFF" />,
    },
    {
      key: "CANCER" as ServiceDomain,
      name: "Cancer Care",
      hindi: "कैंसर जाँच",
      sub: "Screening positives · Confirmation, biopsy, oncology referral",
      accent: "#994242",
      icon: <AlertCircle size={24} color="#FFF" />,
    },
  ];

  const captureRoles: Array<{ id: RoleId; label: string }> = [
    { id: "asha", label: "ASHA (Village Ghurehta)" },
    { id: "anm", label: "ANM / CHO (Sub-centre Ghurehta)" },
    { id: "phc_sn", label: "PHC Staff Nurse (PHC Sirmour)" },
    { id: "chc_sn", label: "CHC Staff Nurse (CHC Teonthar)" },
    { id: "dh_sn", label: "District Hospital Nurse (DH Rewa)" },
    { id: "tert_sn", label: "Tertiary Care Nurse (Jabalpur)" },
  ];

  const insightsRoles: Array<{ id: RoleId; label: string }> = [
    { id: "phc_mo", label: "PHC Medical Officer (PHC Sirmour)" },
    { id: "dpo", label: "District Programme Officer (Rewa)" },
  ];

  const handleSelectRole = (roleId: RoleId, svc: ServiceDomain) => {
    loginAs(roleId, svc);
    onEnterApp();
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--ml-blue)",
      color: "#FFFFFF",
      position: "relative",
      overflowY: "auto",
      padding: "50px 24px 24px 24px"
    }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <img src="assets/logo-mark.png" alt="Logo" style={{ width: 34, height: 34, objectFit: "contain" }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#88DBB1" }}>
            MEDTRONIC LABS
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#FFF" }}>
            Next Steps
          </div>
        </div>
      </div>

      {/* Screen 1: Pick Folder (Capture vs Insights) */}
      {!selectedService && folder === "capture" && (
        <div className="animate-fade-in">
          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, margin: "16px 0 6px" }}>
            Choose your care domain
          </h1>
          <p style={{ fontSize: 14, color: "#D7D4FA", marginBottom: 20 }}>
            अपना कार्यक्षेत्र चुनें
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {services.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedService(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textAlign: "left",
                  width: "100%",
                  padding: 16,
                  border: "none",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  color: "#FFF",
                  transition: "background 0.15s"
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  background: s.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#88DBB1", marginTop: 2 }}>{s.hindi}</div>
                  <div style={{ fontSize: 12, color: "#D7D4FA", marginTop: 2, lineHeight: 1.3 }}>{s.sub}</div>
                </div>
                <ChevronRight size={18} color="#D7D4FA" />
              </button>
            ))}
          </div>

          {/* Switch to Supervisory Insights */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <button
              onClick={() => setFolder("insights")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#FFF",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Layers size={20} color="#88DBB1" />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Supervisory Insights (PHC MO)</div>
                  <div style={{ fontSize: 11, color: "#D7D4FA" }}>Follow-through dashboard & indicators</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Screen 2: Pick Role within Selected Service */}
      {selectedService && (
        <div className="animate-fade-in">
          <button
            onClick={() => setSelectedService(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "#D7D4FA",
              cursor: "pointer",
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Back to domains
          </button>

          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
            Log in as frontline cadre
          </h2>
          <p style={{ fontSize: 13, color: "#D7D4FA", marginBottom: 18 }}>
            Select your assigned role and catchment facility:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {captureRoles.map((r) => {
              const cfg = ROLE_CONFIGS[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r.id, selectedService)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    width: "100%",
                    padding: 14,
                    border: "none",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFF",
                    cursor: "pointer"
                  }}
                >
                  <span style={{
                    background: cfg.accent,
                    padding: "4px 8px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {cfg.short}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{cfg.name}</div>
                    <div style={{ fontSize: 12, color: "#D7D4FA" }}>{cfg.facility}</div>
                  </div>
                  <ChevronRight size={16} color="#D7D4FA" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Screen 3: Insights Folder Role Selection */}
      {folder === "insights" && !selectedService && (
        <div className="animate-fade-in">
          <button
            onClick={() => setFolder("capture")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "#D7D4FA",
              cursor: "pointer",
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Back to Capture
          </button>

          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
            Supervisory Insights
          </h2>
          <p style={{ fontSize: 13, color: "#D7D4FA", marginBottom: 18 }}>
            Woman-wise metrics & care cascade drill-downs (PHC & District):
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insightsRoles.map((r) => {
              const cfg = ROLE_CONFIGS[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r.id, "ANC")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    width: "100%",
                    padding: 16,
                    border: "none",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.15)",
                    color: "#FFF",
                    cursor: "pointer"
                  }}
                >
                  <ShieldCheck size={24} color="#88DBB1" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{cfg.name}</div>
                    <div style={{ fontSize: 12, color: "#D7D4FA" }}>{cfg.facility}</div>
                    <div style={{ fontSize: 11, color: "#88DBB1", marginTop: 2 }}>{cfg.description}</div>
                  </div>
                  <ChevronRight size={18} color="#D7D4FA" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
