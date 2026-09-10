import React, { useState } from "react";
import { useCoordination } from "../context/CoordinationContext";
import { useAuth } from "../context/AuthContext";
import { StepCategory } from "../openphc/types";
import { 
  ArrowLeft, 
  Check, 
  X, 
  Calendar, 
  Building2, 
  Activity, 
  HeartHandshake, 
  Clock, 
  CalendarCheck,
  AlertTriangle,
  Stethoscope,
  Droplet,
  FileText
} from "lucide-react";

interface CaptureViewProps {
  onBack: () => void;
  onSaved: () => void;
}

interface StagedStep {
  category: StepCategory;
  targetFacilityId?: string;
  targetFacilityName?: string;
  dueDate: string;
  priority: "ROUTINE" | "URGENT";
  detailText?: string;
  label: string;
  ac: string;
  sf: string;
}

type ModalType = "REFERRAL" | "ANC_VISIT" | "PMSMA_VISIT" | "USG" | "ASHA_VISIT" | "LAB_TEST" | null;

export const CaptureView: React.FC<CaptureViewProps> = ({ onBack, onSaved }) => {
  const { activePatient, createNextSteps } = useCoordination();
  const { role, service } = useAuth();

  const [stagedSteps, setStagedSteps] = useState<StagedStep[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Relative dates calculation helper
  const now = new Date();
  const formatISO = (d: Date) => d.toISOString().split("T")[0];
  const addDays = (days: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + days);
    return formatISO(dt);
  };

  // 1. Referral State
  const [refFacility, setRefFacility] = useState("DH");
  const [refDate, setRefDate] = useState(addDays(7));
  const [refPriority, setRefPriority] = useState<"ROUTINE" | "URGENT">("ROUTINE");
  const [refNotes, setRefNotes] = useState("");

  // 2. ANC Visit State
  const [ancDate, setAncDate] = useState(addDays(14));
  const [ancSummary, setAncSummary] = useState("Routine 4th ANC Checkup");

  // 3. PMSMA Session Date (Auto-locks to 9th of next month)
  const computeNextPmsma = () => {
    const dt = new Date(now);
    if (dt.getDate() >= 9) {
      dt.setMonth(dt.getMonth() + 1);
    }
    dt.setDate(9);
    return {
      iso: formatISO(dt),
      display: dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    };
  };
  const pmsmaInfo = computeNextPmsma();
  const [pmsmaDate, setPmsmaDate] = useState(pmsmaInfo.iso);

  // 4. USG State
  const [usgDate, setUsgDate] = useState(addDays(7));
  const [usgReason, setUsgReason] = useState("Anomaly / Growth Assessment");

  // 5. ASHA Visit State
  const [ashaVisitDate, setAshaVisitDate] = useState(addDays(3));
  const [ashaVisitType, setAshaVisitType] = useState("HBNC newborn surveillance");

  // 6. Lab Test State
  const [labTestName, setLabTestName] = useState("Hemoglobin (Hb) Check");
  const [labDate, setLabDate] = useState(addDays(3));

  const [saving, setSaving] = useState(false);

  if (!activePatient) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
        <p>No patient selected.</p>
        <button onClick={onBack} style={{ padding: "8px 16px", borderRadius: 10, background: "var(--ml-blue)", color: "#FFF", border: "none" }}>
          Go Back
        </button>
      </div>
    );
  }

  // Facility Ladder Options
  const facilities = [
    { id: "PHC", name: "PHC Sirmour", level: "Primary Health Centre", tone: "#6165DE" },
    { id: "CHC", name: "CHC Teonthar", level: "Community Health Centre (FRU)", tone: "#1E14BE" },
    { id: "DH", name: "District Hospital, Rewa", level: "District Hospital (Specialist)", tone: "#994242" },
    { id: "TERTIARY", name: "Medical College, Jabalpur", level: "Tertiary Care Centre", tone: "#C35721" },
  ];

  // Stage adding handlers
  const stageReferral = () => {
    const fac = facilities.find((f) => f.id === refFacility) || facilities[2];
    setStagedSteps([
      ...stagedSteps,
      {
        category: "REFERRAL",
        targetFacilityId: refFacility,
        targetFacilityName: fac.name,
        dueDate: refDate,
        priority: refPriority,
        detailText: refNotes || `Referral to ${fac.level}`,
        label: `Referral → ${fac.name}`,
        ac: "#1E14BE",
        sf: "#EFEDFF",
      },
    ]);
    setActiveModal(null);
  };

  const stageAncVisit = () => {
    setStagedSteps([
      ...stagedSteps,
      {
        category: "ANC_VISIT",
        targetFacilityId: "SUBCENTRE",
        targetFacilityName: "Sub-centre Ghurehta",
        dueDate: ancDate,
        priority: "ROUTINE",
        detailText: ancSummary,
        label: `Next ANC Visit · Due ${ancDate}`,
        ac: "#2E9E6B",
        sf: "#E7F6EE",
      },
    ]);
    setActiveModal(null);
  };

  const stagePmsmaVisit = () => {
    setStagedSteps([
      ...stagedSteps,
      {
        category: "PMSMA_VISIT",
        targetFacilityId: "PHC",
        targetFacilityName: "PHC Sirmour",
        dueDate: pmsmaDate,
        priority: "ROUTINE",
        detailText: "PMSMA Specialist Session (9th)",
        label: `PMSMA Session · 9th ${pmsmaInfo.display.split(" ")[1]}`,
        ac: "#C35721",
        sf: "#FBEDE4",
      },
    ]);
    setActiveModal(null);
  };

  const stageUsg = () => {
    setStagedSteps([
      ...stagedSteps,
      {
        category: "IMAGING",
        targetFacilityId: "CHC",
        targetFacilityName: "CHC Teonthar (USG Facility)",
        dueDate: usgDate,
        priority: "ROUTINE",
        detailText: usgReason,
        label: `USG Scan · ${usgReason}`,
        ac: "#188673",
        sf: "#E6F5F2",
      },
    ]);
    setActiveModal(null);
  };

  const stageAshaVisit = () => {
    setStagedSteps([
      ...stagedSteps,
      {
        category: "HOME_VISIT",
        dueDate: ashaVisitDate,
        priority: "ROUTINE",
        detailText: `${ashaVisitType} by ASHA ${activePatient.ashaName}`,
        label: `ASHA Home Visit · ${ashaVisitType}`,
        ac: "#6165DE",
        sf: "#F0EFFF",
      },
    ]);
    setActiveModal(null);
  };

  const stageLabTest = () => {
    setStagedSteps([
      ...stagedSteps,
      {
        category: "LAB",
        dueDate: labDate,
        priority: "ROUTINE",
        detailText: labTestName,
        label: `Lab Test · ${labTestName}`,
        ac: "#994242",
        sf: "#FBEBEB",
      },
    ]);
    setActiveModal(null);
  };

  const handleRemoveStaged = (index: number) => {
    setStagedSteps(stagedSteps.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (stagedSteps.length === 0) return;
    setSaving(true);
    try {
      await createNextSteps(
        activePatient.id,
        stagedSteps.map((s) => ({
          category: s.category,
          targetFacilityId: s.targetFacilityId,
          dueDate: s.dueDate,
          priority: s.priority,
          detailText: s.detailText,
        }))
      );
      onSaved();
    } catch (err) {
      console.error("Failed to commit next steps:", err);
    } finally {
      setSaving(false);
    }
  };

  // Determine option grid based on active cohort
  const isCancer = service === "CANCER";
  const isNCD = service === "NCD";

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 120px" }}>
        {/* Header Back & Context */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "none",
              color: "var(--ml-blue)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <span style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "#EFEDFF",
            color: "var(--ml-blue)",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 999,
            padding: "4px 10px"
          }}>
            <Clock size={13} /> Visit · now
          </span>
        </div>

        {/* Woman summary line */}
        <div style={{ fontSize: 13, color: "var(--ml-ink-500)", marginBottom: 4 }}>
          For <strong style={{ color: "var(--ml-ink-900)" }}>{activePatient.name}</strong> · 28w 4d · {activePatient.village}
        </div>

        <h2 style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ml-ink-900)", margin: "0 0 6px" }}>
          What happens next?
        </h2>
        <p style={{ fontSize: 13, color: "var(--ml-ink-500)", margin: "0 0 16px", lineHeight: 1.4 }}>
          Choose what needs to happen after today's visit.
        </p>

        {/* 2-Column Option Grid (matching Medtronic LABS prototypes) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 24 }}>
          {/* Card 1: Referral */}
          <button
            onClick={() => setActiveModal("REFERRAL")}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 96,
              textAlign: "left",
              padding: 13,
              border: "1px solid #ECEAE4",
              borderRadius: 16,
              background: "#EFEDFF",
              cursor: "pointer"
            }}
          >
            <Building2 size={22} color="#1E14BE" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.15 }}>
              {isCancer ? "Tertiary Oncology Referral" : isNCD ? "Specialist Referral" : "Referral"}
            </span>
          </button>

          {/* Card 2: Next ANC / Routine Visit */}
          <button
            onClick={() => setActiveModal("ANC_VISIT")}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 96,
              textAlign: "left",
              padding: 13,
              border: "1px solid #ECEAE4",
              borderRadius: 16,
              background: "#E7F6EE",
              cursor: "pointer"
            }}
          >
            <Calendar size={22} color="#2E9E6B" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.15 }}>
              {isCancer ? "Chemo Follow-up" : isNCD ? "Monthly Drug Refill" : "Next ANC visit"}
            </span>
          </button>

          {/* Card 3: PMSMA Visit */}
          <button
            onClick={() => setActiveModal("PMSMA_VISIT")}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 96,
              textAlign: "left",
              padding: 13,
              border: "1px solid #ECEAE4",
              borderRadius: 16,
              background: "#FBEDE4",
              cursor: "pointer"
            }}
          >
            <CalendarCheck size={22} color="#C35721" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.15 }}>
              {isCancer ? "Symptom & Pain Check" : isNCD ? "Quarterly Review" : "PMSMA visit (9th)"}
            </span>
          </button>

          {/* Card 4: USG / Ultrasound */}
          <button
            onClick={() => setActiveModal("USG")}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 96,
              textAlign: "left",
              padding: 13,
              border: "1px solid #ECEAE4",
              borderRadius: 16,
              background: "#E6F5F2",
              cursor: "pointer"
            }}
          >
            <Activity size={22} color="#188673" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.15 }}>
              {isCancer ? "Mammography / Scan" : isNCD ? "Complication Screening" : "USG / Ultrasound"}
            </span>
          </button>

          {/* Card 5: ASHA Home Visit */}
          <button
            onClick={() => setActiveModal("ASHA_VISIT")}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 96,
              textAlign: "left",
              padding: 13,
              border: "1px solid #ECEAE4",
              borderRadius: 16,
              background: "#F0EFFF",
              cursor: "pointer"
            }}
          >
            <HeartHandshake size={22} color="#6165DE" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.15 }}>
              {isCancer ? "Palliative Home Care" : isNCD ? "ASHA BP/Sugar Monitoring" : "ASHA home visit"}
            </span>
          </button>

          {/* Card 6: Blood / Lab Test */}
          <button
            onClick={() => setActiveModal("LAB_TEST")}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 96,
              textAlign: "left",
              padding: 13,
              border: "1px solid #ECEAE4",
              borderRadius: 16,
              background: "#FBEBEB",
              cursor: "pointer"
            }}
          >
            <Droplet size={22} color="#994242" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)", lineHeight: 1.15 }}>
              {isCancer ? "Biopsy / Histopath" : isNCD ? "Lab Panel (HbA1c/Lipid)" : "Blood / Lab test"}
            </span>
          </button>
        </div>

        {/* Staged Commitments Section Header */}
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ml-ink-500)", marginBottom: 10 }}>
          This visit · {stagedSteps.length} {stagedSteps.length === 1 ? "step added" : "steps added"}
        </div>

        {/* Staged Steps List */}
        {stagedSteps.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stagedSteps.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 13px",
                  background: "#FFF",
                  border: "1px solid #ECEAE4",
                  borderLeft: `4px solid ${s.ac}`,
                  borderRadius: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                }}
              >
                <span style={{
                  flex: "none",
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: s.sf,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.ac
                }}>
                  {s.category === "REFERRAL" ? <Building2 size={19} /> :
                   s.category === "ANC_VISIT" ? <Calendar size={19} /> :
                   s.category === "PMSMA_VISIT" ? <CalendarCheck size={19} /> :
                   s.category === "IMAGING" ? <Activity size={19} /> :
                   s.category === "HOME_VISIT" ? <HeartHandshake size={19} /> : <Droplet size={19} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ml-ink-900)" }}>
                    {s.label}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ml-ink-500)", marginTop: 2 }}>
                    {s.detailText || `Due: ${s.dueDate}`}
                  </span>
                </span>
                <button
                  onClick={() => handleRemoveStaged(idx)}
                  title="Remove"
                  style={{
                    flex: "none",
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: "1px solid #ECEAE4",
                    background: "#FAF9F6",
                    color: "var(--ml-ink-400)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            border: "1.5px dashed #DEDDD8",
            borderRadius: 16,
            padding: "24px 20px",
            textAlign: "center",
            color: "var(--ml-ink-500)",
            fontSize: 13.5,
            lineHeight: 1.5,
            background: "#FFF"
          }}>
            Tap an option above to add the first next step.
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar (matching prototype) */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "12px 16px 20px",
        background: "linear-gradient(to top, var(--surface-page) 75%, transparent)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
        <div style={{ flex: "none", fontSize: 11.5, color: "var(--ml-ink-500)", lineHeight: 1.3 }}>
          &lt; 30s<br />this visit
        </div>
        <button
          onClick={handleSaveAll}
          disabled={stagedSteps.length === 0 || saving}
          style={{
            flex: 1,
            padding: "15px",
            border: "none",
            borderRadius: 16,
            background: stagedSteps.length === 0 ? "#C9C7C2" : "var(--ml-blue)",
            color: "#FFF",
            fontSize: 15,
            fontWeight: 700,
            cursor: stagedSteps.length === 0 ? "not-allowed" : "pointer",
            boxShadow: stagedSteps.length > 0 ? "0 4px 12px rgba(30,20,190,0.25)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.15s ease"
          }}
        >
          <Check size={18} strokeWidth={2.8} />
          <span>{saving ? "Saving & scheduling..." : "Save · schedule reminders"}</span>
        </button>
      </div>

      {/* ================= MODAL 1: REFERRAL ================= */}
      {activeModal === "REFERRAL" && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,11,18,0.45)", zIndex: 110, display: "flex", alignItems: "flex-end" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "85vh", background: "#FFF", borderRadius: "24px 24px 0 0", padding: "16px 18px 28px", overflowY: "auto" }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 4 }}>
              Raise a referral
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Next step is created in her chain and visible to receiving facility (NS-4).
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", marginBottom: 8 }}>
              Receiving Facility (Facility Tier Ladder)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  onClick={() => setRefFacility(fac.id)}
                  style={{
                    padding: "11px 12px",
                    borderRadius: 12,
                    border: refFacility === fac.id ? "1.8px solid var(--ml-blue)" : "1px solid #ECEAE4",
                    background: refFacility === fac.id ? "#EFEDFF" : "#FAF9F6",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ml-ink-900)" }}>{fac.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ml-ink-500)" }}>{fac.level}</div>
                  </div>
                  {refFacility === fac.id && <Check size={18} color="var(--ml-blue)" />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", marginBottom: 6 }}>
              Due Date
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[
                { label: "Today", d: addDays(0) },
                { label: "+3 days", d: addDays(3) },
                { label: "+1 week", d: addDays(7) },
                { label: "+2 weeks", d: addDays(14) },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setRefDate(q.d)}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    border: refDate === q.d ? "1.5px solid var(--ml-blue)" : "1px solid #DEDDD8",
                    borderRadius: 8,
                    background: refDate === q.d ? "#EFEDFF" : "#FFF",
                    color: refDate === q.d ? "var(--ml-blue)" : "var(--ml-ink-700)",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #DEDDD8", borderRadius: 10, background: "#FAF9F6", fontSize: 13.5, marginBottom: 14, outline: "none" }}
            />

            <button
              onClick={stageReferral}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: "var(--ml-blue)", color: "#FFF", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Add to staged visit
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ANC VISIT ================= */}
      {activeModal === "ANC_VISIT" && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,11,18,0.45)", zIndex: 110, display: "flex", alignItems: "flex-end" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "80vh", background: "#FFF", borderRadius: "24px 24px 0 0", padding: "16px 18px 28px", overflowY: "auto" }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 4 }}>
              Next ANC Visit
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Schedule next checkup at Sub-centre Ghurehta.
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", marginBottom: 8 }}>
              Schedule Shortcut
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
              {[
                { label: "+2 weeks", d: addDays(14) },
                { label: "+4 weeks", d: addDays(28) },
                { label: "+6 weeks", d: addDays(42) },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setAncDate(q.d)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    border: ancDate === q.d ? "1.5px solid #2E9E6B" : "1px solid #DEDDD8",
                    borderRadius: 10,
                    background: ancDate === q.d ? "#E7F6EE" : "#FFF",
                    color: ancDate === q.d ? "#2E9E6B" : "var(--ml-ink-700)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={ancDate}
              onChange={(e) => setAncDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #DEDDD8", borderRadius: 10, background: "#FAF9F6", fontSize: 13.5, marginBottom: 14, outline: "none" }}
            />

            <button
              onClick={stageAncVisit}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: "#2E9E6B", color: "#FFF", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Add ANC Visit
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: PMSMA VISIT ================= */}
      {activeModal === "PMSMA_VISIT" && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,11,18,0.45)", zIndex: 110, display: "flex", alignItems: "flex-end" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", background: "#FFF", borderRadius: "24px 24px 0 0", padding: "16px 18px 28px" }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 4 }}>
              PMSMA Specialist Session (NS-10)
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              National fixed-day session held on the <strong>9th of every month</strong> at PHC Sirmour.
            </div>

            <div style={{ padding: "14px 16px", borderRadius: 14, background: "#FBEDE4", border: "1px solid #F5C5AB", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#C35721", textTransform: "uppercase" }}>Auto-locked Date</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#C35721", marginTop: 2 }}>{pmsmaInfo.display}</div>
              <div style={{ fontSize: 11.5, color: "var(--ml-ink-600)", marginTop: 4 }}>
                Specialist Obstetrician & USG screening team available on-site.
              </div>
            </div>

            <button
              onClick={stagePmsmaVisit}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: "#C35721", color: "#FFF", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Add PMSMA Session
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: USG ================= */}
      {activeModal === "USG" && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,11,18,0.45)", zIndex: 110, display: "flex", alignItems: "flex-end" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", background: "#FFF", borderRadius: "24px 24px 0 0", padding: "16px 18px 28px" }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 4 }}>
              USG / Ultrasound Scan
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Schedule scan at CHC Teonthar or District Hospital Rewa.
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", marginBottom: 8 }}>
              Scan Date
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
              {[
                { label: "+1 week", d: addDays(7) },
                { label: "+2 weeks", d: addDays(14) },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setUsgDate(q.d)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    border: usgDate === q.d ? "1.5px solid #188673" : "1px solid #DEDDD8",
                    borderRadius: 10,
                    background: usgDate === q.d ? "#E6F5F2" : "#FFF",
                    color: usgDate === q.d ? "#188673" : "var(--ml-ink-700)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <button
              onClick={stageUsg}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: "#188673", color: "#FFF", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Add USG Scan
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: ASHA VISIT ================= */}
      {activeModal === "ASHA_VISIT" && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,11,18,0.45)", zIndex: 110, display: "flex", alignItems: "flex-end" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", background: "#FFF", borderRadius: "24px 24px 0 0", padding: "16px 18px 28px" }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 4 }}>
              ASHA Home Visit
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Assign home follow-up to linked ASHA <strong>{activePatient.ashaName}</strong>.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
              {[
                "High-risk maternal blood pressure & nutrition check",
                "HBNC newborn home surveillance",
                "Referral adherence & transport assistance",
              ].map((reason) => (
                <div
                  key={reason}
                  onClick={() => setAshaVisitType(reason)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: ashaVisitType === reason ? "1.8px solid #6165DE" : "1px solid #ECEAE4",
                    background: ashaVisitType === reason ? "#F0EFFF" : "#FAF9F6",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--ml-ink-900)"
                  }}
                >
                  {reason}
                </div>
              ))}
            </div>

            <button
              onClick={stageAshaVisit}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: "#6165DE", color: "#FFF", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Add ASHA Visit
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: LAB TEST ================= */}
      {activeModal === "LAB_TEST" && (
        <div 
          onClick={() => setActiveModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,11,18,0.45)", zIndex: 110, display: "flex", alignItems: "flex-end" }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", background: "#FFF", borderRadius: "24px 24px 0 0", padding: "16px 18px 28px" }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 4 }}>
              Laboratory Diagnostics
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Point of care or hub testing.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
              {[
                "Hemoglobin (Hb) Check",
                "Blood Sugar / OGTT",
                "Urine Albumin & Sugar",
                "Triple Viral Screening (HIV/HBsAg/Syphilis)",
              ].map((test) => (
                <div
                  key={test}
                  onClick={() => setLabTestName(test)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: labTestName === test ? "1.8px solid #994242" : "1px solid #ECEAE4",
                    background: labTestName === test ? "#FBEBEB" : "#FAF9F6",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--ml-ink-900)"
                  }}
                >
                  {test}
                </div>
              ))}
            </div>

            <button
              onClick={stageLabTest}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 14, background: "#994242", color: "#FFF", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Add Lab Diagnostic
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
