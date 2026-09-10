import React, { useState } from "react";
import { useCoordination } from "../context/CoordinationContext";
import { useAuth } from "../context/AuthContext";
import { VILLAGES } from "../db";
import { ArrowLeft, Check, User, ShieldAlert, Sparkles, ChevronDown } from "lucide-react";

interface RegisterViewProps {
  onBack: () => void;
  onRegistered: (patientId: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onBack, onRegistered }) => {
  const { registerPatient } = useCoordination();
  const { service } = useAuth();

  const [name, setName] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [phone, setPhone] = useState("");
  const [villageName, setVillageName] = useState(VILLAGES[0].name);
  const [abhaOrRch, setAbhaOrRch] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [status, setStatus] = useState<"NORMAL" | "HRP">("NORMAL");
  const [consentWhatsApp, setConsentWhatsApp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Auto-resolve linked ASHA from configured village list (NS-3, NS-8)
  const selectedVillage = VILLAGES.find((v) => v.name === villageName) || VILLAGES[0];

  const domainConfig = {
    ANC: {
      title: "Register a pregnant woman",
      note: "Name and mobile are required. No clinical details — ever.",
      dateLabel: "LMP (last menstrual period)",
      hasDate: true,
      flags: { NORMAL: "Normal", HRP: "HRP" },
      flagTitle: "Pregnancy Risk Category",
      flagNote: "High-Risk Pregnancies are prioritized for specialist referral and monthly PMSMA."
    },
    PNC: {
      title: "Register a postnatal mother",
      note: "Mother and baby are followed together. No clinical details — ever.",
      dateLabel: "Date of delivery",
      hasDate: true,
      flags: { NORMAL: "Both well", HRP: "Danger signs" },
      flagTitle: "Postnatal Status",
      flagNote: "Danger signs alert both Sub-centre ANM and village ASHA."
    },
    NCD: {
      title: "Register an NCD client",
      note: "Readings stay in the NCD register — this records only what happens next.",
      dateLabel: "",
      hasDate: false,
      flags: { NORMAL: "Controlled", HRP: "Uncontrolled" },
      flagTitle: "Control Status",
      flagNote: "Uncontrolled blood pressure or blood sugar triggers specialist review."
    },
    CANCER: {
      title: "Register a screened client",
      note: "Screening outcome stays in the register — this records only what happens next.",
      dateLabel: "",
      hasDate: false,
      flags: { NORMAL: "Under follow-up", HRP: "Screen positive" },
      flagTitle: "Screening Outcome",
      flagNote: "Screen-positive clients are tracked for confirmation at District Hospital."
    },
  };

  const cfg = domainConfig[service] || domainConfig.ANC;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setSubmitting(true);
    try {
      const patient = await registerPatient({
        name: name.trim(),
        nameHi: nameHi.trim() || undefined,
        phone: phone.trim(),
        village: selectedVillage.name,
        ashaName: selectedVillage.ashaName,
        ashaPhone: selectedVillage.ashaPhone,
        status,
        service,
        rchId: abhaOrRch.trim().startsWith("RCH") ? abhaOrRch.trim() : undefined,
        abhaId: !abhaOrRch.trim().startsWith("RCH") && abhaOrRch.trim() ? abhaOrRch.trim() : undefined,
        lmpDate: service === "ANC" ? dateVal : undefined,
        deliveryDate: service === "PNC" ? dateVal : undefined,
        consentWhatsApp,
        homeSubcentreId: "SUBCENTRE",
      });

      onRegistered(patient.id);
    } catch (err) {
      console.error("Failed to register:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      overflowY: "auto",
      position: "relative"
    }}>
      <form onSubmit={handleSubmit} style={{ padding: "16px 16px 88px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "var(--ml-blue)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            padding: 0
          }}
        >
          <ArrowLeft size={16} /> Back to lookup
        </button>

        {/* Title & Note */}
        <div>
          <h2 style={{
            fontSize: 22,
            lineHeight: 1.15,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-strong)",
            margin: "0 0 5px"
          }}>
            {cfg.title}
          </h2>
          <p style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.45
          }}>
            {cfg.note}
          </p>
        </div>

        {/* Full name * */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", marginBottom: 6 }}>
            Full name <span style={{ color: "var(--ml-merlot)" }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Her full name (e.g. Sunita Devi)"
            required
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "1.5px solid var(--border-default)",
              borderRadius: 14,
              background: "#FFFFFF",
              fontSize: 15,
              fontFamily: "inherit",
              color: "var(--text-strong)",
              outline: "none"
            }}
          />
        </div>

        {/* Mobile number * */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", marginBottom: 6 }}>
            Mobile number <span style={{ color: "var(--ml-merlot)" }}>*</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            placeholder="+91 10-digit mobile"
            required
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "1.5px solid var(--border-default)",
              borderRadius: 14,
              background: "#FFFFFF",
              fontSize: 15,
              fontFamily: "inherit",
              color: "var(--text-strong)",
              outline: "none"
            }}
          />
        </div>

        {/* Village * with auto-resolving linked ASHA badge */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-body)" }}>
              Village <span style={{ color: "var(--ml-merlot)" }}>*</span>
            </span>
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "#EFEDFF",
              color: "#1E14BE",
              borderRadius: 999,
              padding: "3px 10px 3px 8px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap"
            }}>
              <User size={12} />
              ASHA · {selectedVillage.ashaName}
            </span>
          </div>

          <div style={{ position: "relative" }}>
            <select
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 38px 13px 14px",
                border: "1.5px solid var(--border-default)",
                borderRadius: 14,
                background: "#FFFFFF",
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "inherit",
                color: "var(--text-strong)",
                outline: "none",
                appearance: "none"
              }}
            >
              {VILLAGES.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown size={18} color="var(--ml-ink-500)" style={{ position: "absolute", right: 13, top: "50%", marginTop: -9, pointerEvents: "none" }} />
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.4 }}>
            Villages and their linked ASHA come from deployment configuration. Escalations route to the linked ASHA (NS-8) — she is never typed in.
          </div>
        </div>

        {/* ABHA / RCH ID optional */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", marginBottom: 6 }}>
            ABHA / RCH ID <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>optional</span>
          </label>
          <input
            value={abhaOrRch}
            onChange={(e) => setAbhaOrRch(e.target.value)}
            placeholder="14-digit ABHA or RCH ID"
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "1.5px solid var(--border-default)",
              borderRadius: 14,
              background: "#FFFFFF",
              fontSize: 15,
              fontFamily: "inherit",
              color: "var(--text-strong)",
              outline: "none"
            }}
          />
        </div>

        {/* Optional LMP or Delivery Date */}
        {cfg.hasDate && (
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-body)", marginBottom: 6 }}>
              {cfg.dateLabel} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>optional</span>
            </label>
            <input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid var(--border-default)",
                borderRadius: 14,
                background: "#FFFFFF",
                fontSize: 15,
                fontFamily: "inherit",
                color: "var(--text-strong)",
                outline: "none"
              }}
            />
          </div>
        )}

        {/* Risk / Status Cohort Selector */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #ECEAE4",
          borderRadius: 16,
          padding: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", marginBottom: 10 }}>
            {cfg.flagTitle}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setStatus("NORMAL")}
              style={{
                flex: 1,
                padding: "12px 8px",
                borderRadius: 12,
                border: status === "NORMAL" ? "1.5px solid #2E9E6B" : "1.5px solid #ECEAE4",
                background: status === "NORMAL" ? "#EBFBF1" : "#FFF",
                color: status === "NORMAL" ? "#166534" : "var(--ml-ink-700)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              {status === "NORMAL" && <Check size={16} />}
              <span>{cfg.flags.NORMAL}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("HRP")}
              style={{
                flex: 1,
                padding: "12px 8px",
                borderRadius: 12,
                border: status === "HRP" ? "1.5px solid #C53B27" : "1.5px solid #ECEAE4",
                background: status === "HRP" ? "#FFF4F2" : "#FFF",
                color: status === "HRP" ? "#C53B27" : "var(--ml-ink-700)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              {status === "HRP" && <Check size={16} />}
              <span>{cfg.flags.HRP}</span>
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
            {cfg.flagNote}
          </div>
        </div>

        {/* Sticky Bottom Save Button */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px 20px 16px",
          background: "linear-gradient(to top, var(--surface-page) 80%, transparent)",
          zIndex: 30
        }}>
          <button
            type="submit"
            disabled={!name.trim() || !phone.trim() || submitting}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: 14,
              background: "var(--ml-blue)",
              color: "#FFF",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: (!name.trim() || !phone.trim() || submitting) ? "not-allowed" : "pointer",
              opacity: (!name.trim() || !phone.trim() || submitting) ? 0.6 : 1,
              boxShadow: "0 2px 8px rgba(30,20,190,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <Check size={18} />
            <span>Save &amp; open her journey</span>
          </button>
        </div>
      </form>
    </div>
  );
};
