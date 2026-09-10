import React, { useState } from "react";
import { useCoordination } from "../context/CoordinationContext";
import { useAuth } from "../context/AuthContext";
import { Search, UserPlus, QrCode, ChevronRight, Info } from "lucide-react";

interface LookupViewProps {
  onSelectPatient: (patientId: string) => void;
  onGoToRegister: () => void;
  onScanQR: () => void;
}

type SearchMode = "MOBILE" | "ABHA" | "RCH" | "NAME";

export const LookupView: React.FC<LookupViewProps> = ({ onSelectPatient, onGoToRegister, onScanQR }) => {
  const { patients, steps } = useCoordination();
  const { service } = useAuth();
  
  const [searchMode, setSearchMode] = useState<SearchMode>("MOBILE");
  const [searchQuery, setSearchQuery] = useState("");

  const searchModes: Array<{ id: SearchMode; label: string; placeholder: string; inputMode: "numeric" | "text" }> = [
    { id: "MOBILE", label: "Mobile", placeholder: "+91 10-digit mobile", inputMode: "numeric" },
    { id: "ABHA", label: "ABHA ID", placeholder: "14-digit ABHA ID", inputMode: "numeric" },
    { id: "RCH", label: "RCH ID", placeholder: "RCH ID (12 digits)", inputMode: "text" },
    { id: "NAME", label: "Name", placeholder: "Client's full name", inputMode: "text" },
  ];

  const activeModeObj = searchModes.find((m) => m.id === searchMode) || searchModes[0];

  const domainLabels = {
    ANC: { title: "Find a pregnant woman", enrol: "Register a pregnant woman", empty: "pregnant woman" },
    PNC: { title: "Find a postnatal mother", enrol: "Register a postnatal mother", empty: "postnatal mother" },
    NCD: { title: "Find an NCD client", enrol: "Register an NCD client", empty: "NCD client" },
    CANCER: { title: "Find a screened client", enrol: "Register screened client", empty: "screened client" },
  };

  const labels = domainLabels[service] || domainLabels.ANC;

  // Filter patients by active service & query
  const filteredPatients = patients.filter((p) => {
    // Filter by service first (or show all if empty)
    const matchesService = p.service === service;
    if (!matchesService) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    if (searchMode === "MOBILE") return p.phone.includes(q);
    if (searchMode === "ABHA") return p.abhaId ? p.abhaId.toLowerCase().includes(q) : false;
    if (searchMode === "RCH") return p.rchId ? p.rchId.toLowerCase().includes(q) : false;
    if (searchMode === "NAME") return p.name.toLowerCase().includes(q) || (p.nameHi && p.nameHi.includes(q));
    return true;
  });

  // Avatar palette
  const avatarColors = ["#1E14BE", "#6165DE", "#994242", "#C35721", "#2E9E6B", "#655AD0"];

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      overflowY: "auto",
      padding: "16px 16px 84px 16px"
    }}>
      {/* Search Input Bar + Scan Button */}
      <div style={{ display: "flex", gap: 9, marginBottom: 8 }}>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "12px 14px",
          background: "#FFFFFF",
          border: "1.5px solid #DEDDD8",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <Search size={19} color="var(--ml-ink-500)" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeModeObj.placeholder}
            inputMode={activeModeObj.inputMode}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              fontFamily: "inherit",
              color: "var(--text-strong)"
            }}
          />
        </div>

        <button
          onClick={onScanQR}
          title="Scan ABHA QR"
          style={{
            flex: "none",
            width: 48,
            borderRadius: 14,
            border: "none",
            background: "var(--ml-blue)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            boxShadow: "0 2px 6px rgba(30,20,190,0.2)"
          }}
        >
          <QrCode size={22} />
        </button>
      </div>

      {/* 4 Search Mode Pills */}
      <div style={{ display: "flex", gap: 7, margin: "2px 0 10px" }}>
        {searchModes.map((m) => {
          const isSelected = searchMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSearchMode(m.id)}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: 12,
                border: isSelected ? "1.5px solid var(--ml-blue)" : "1.5px solid #ECEAE4",
                background: isSelected ? "#EFEDFF" : "#FFFFFF",
                color: isSelected ? "#1E14BE" : "var(--ml-ink-700)",
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.12s"
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <p style={{
        fontSize: 11.5,
        color: "var(--text-muted)",
        margin: "0 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 6
      }}>
        <Info size={13} style={{ flex: "none" }} />
        <span>Search by phone or ABHA only — never by name (BR-101)</span>
      </p>

      {/* Action to Register if not found */}
      <button
        onClick={onGoToRegister}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "#F6F5FF",
          border: "1.5px dashed #C6C2F2",
          borderRadius: 14,
          color: "var(--ml-blue)",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginBottom: 16
        }}
      >
        <UserPlus size={16} />
        <span>+ {labels.enrol}</span>
      </button>

      {/* Results Header */}
      <div style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 10
      }}>
        {filteredPatients.length} {labels.empty} records
      </div>

      {/* Results List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredPatients.length === 0 ? (
          <div style={{
            padding: "36px 16px",
            textAlign: "center",
            background: "#FFF",
            borderRadius: 16,
            border: "1px dashed #ECEAE4"
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-700)" }}>
              No {labels.empty} found
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginTop: 4 }}>
              Check the phone number or register her above.
            </div>
          </div>
        ) : (
          filteredPatients.map((patient, idx) => {
            const initials = patient.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const avatarBg = avatarColors[idx % avatarColors.length];
            const openCount = steps.filter((s) => s.patientId === patient.id && (s.status === "SCHEDULED" || s.status === "PENDING")).length;

            return (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                style={{
                  textAlign: "left",
                  width: "100%",
                  padding: "13px 14px",
                  background: "#FFFFFF",
                  border: "1px solid #ECEAE4",
                  borderRadius: 16,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "inherit"
                }}
              >
                {/* Avatar Initials */}
                <span style={{
                  flex: "none",
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFF",
                  fontWeight: 700,
                  fontSize: 14
                }}>
                  {initials}
                </span>

                {/* Details */}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {patient.name}
                    </span>
                    {patient.nameHi && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flex: "none" }}>
                        {patient.nameHi}
                      </span>
                    )}
                  </span>

                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: patient.status === "HRP" ? "#FCE8E8" : "#E7F6EE",
                      color: patient.status === "HRP" ? "#994242" : "#2E9E6B"
                    }}>
                      {patient.status}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-body)" }}>
                      {patient.village}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      · ASHA: {patient.ashaName}
                    </span>
                  </span>
                </span>

                {/* Open Step Badge or Chevron */}
                {openCount > 0 ? (
                  <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: patient.status === "HRP" ? "#994242" : "#1E14BE",
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none"
                  }}>
                    {openCount}
                  </span>
                ) : (
                  <ChevronRight size={18} color="var(--ml-ink-400)" style={{ flex: "none" }} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
