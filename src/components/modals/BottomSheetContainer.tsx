import React, { useState } from "react";
import { ActiveDialog, NextStep, Patient, TrackingOutcomeType } from "../../openphc/types";
import { 
  Building2, 
  Clock, 
  Check, 
  AlertTriangle, 
  Send, 
  Phone, 
  Calendar, 
  X, 
  CheckCircle2, 
  MessageCircle, 
  QrCode,
  ChevronRight
} from "lucide-react";

interface BottomSheetContainerProps {
  dialog: ActiveDialog;
  onClose: () => void;
  onConfirmReferral: (targetFacilityId: string, targetFacilityName: string) => Promise<void>;
  onConfirmAncVisit: (date: string, summary: string) => Promise<void>;
  onConfirmPmsmaVisit: (sessionDate: string) => Promise<void>;
  onConfirmUsg: (date: string) => Promise<void>;
  onConfirmAshaRef: (who: string, targetFacilityId: string) => Promise<void>;
  onConfirmHbnc: (selectedDates: string[]) => Promise<void>;
  onCompleteStep: (stepId: string, outcome: TrackingOutcomeType) => Promise<void>;
  onRescheduleStep: (stepId: string, newDate: string) => Promise<void>;
  onSendSms: (stepId: string, text: string) => Promise<void>;
  onScanResult: (simulatedPatientId: string) => void;
  onOpenDialog: (dlg: ActiveDialog) => void;
  onConfirmLabTest?: (testName: string, date: string) => Promise<void>;
}

export const BottomSheetContainer: React.FC<BottomSheetContainerProps> = ({
  dialog,
  onClose,
  onConfirmReferral,
  onConfirmAncVisit,
  onConfirmPmsmaVisit,
  onConfirmUsg,
  onConfirmAshaRef,
  onConfirmHbnc,
  onCompleteStep,
  onRescheduleStep,
  onSendSms,
  onScanResult,
  onOpenDialog,
  onConfirmLabTest,
}) => {
  if (!dialog) return null;

  // Relative dates calculation
  const now = new Date();
  const formatISO = (d: Date) => d.toISOString().split("T")[0];
  const addDays = (days: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + days);
    return formatISO(dt);
  };

  // 1. Referral Dialog State
  const [selectedFacility, setSelectedFacility] = useState<string>("DH");
  const facilities = [
    { id: "PHC", name: "PHC Sirmour", level: "PHC", tag: "MO + SN", tone: "#6165DE", dot: "#6165DE" },
    { id: "CHC", name: "CHC Teonthar", level: "CHC", tag: "FRU", tone: "#1E14BE", dot: "#1E14BE" },
    { id: "DH", name: "District Hospital, Rewa", level: "District Hospital", tag: "Specialist", tone: "#994242", dot: "#994242" },
    { id: "TERTIARY", name: "Medical College, Jabalpur", level: "Tertiary", tag: "Advanced", tone: "#C35721", dot: "#C35721" },
  ];

  // 2. ANC Visit Dialog State
  const [ancDate, setAncDate] = useState<string>(addDays(14));

  // 3. USG Dialog State
  const [usgDate, setUsgDate] = useState<string>(addDays(7));

  // 4. PNC Referral State
  const [ashaRefWho, setAshaRefWho] = useState<string>("BOTH");
  const [ashaRefFac, setAshaRefFac] = useState<string>("PHC");

  // 5. HBNC Dialog State
  const [hbncDates, setHbncDates] = useState<string[]>([
    addDays(1), addDays(3), addDays(7), addDays(14), addDays(21), addDays(28), addDays(42)
  ]);

  // 6. Complete Outcome State
  const [selectedOutcome, setSelectedOutcome] = useState<TrackingOutcomeType>("COMPLETED_REFERRED_PUBLIC");

  // 7. Reschedule State
  const [reschedDate, setReschedDate] = useState<string>(addDays(7));

  // 8. Lab Test State
  const [selectedLabTest, setSelectedLabTest] = useState<string>("Hemoglobin (Hb) Check");
  const [labDate, setLabDate] = useState<string>(addDays(7));

  // Auto-calculated PMSMA date (9th of next month)
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

  return (
    <div 
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11, 11, 18, 0.45)",
        zIndex: 100,
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
          maxHeight: "88vh",
          background: "#FFFFFF",
          borderRadius: "26px 26px 0 0",
          padding: "16px 18px 32px 18px",
          overflowY: "auto",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}
      >
        {/* Drag Handle Bar */}
        <div style={{ width: 38, height: 4, borderRadius: 2, background: "#DEDDD8", margin: "0 auto 4px" }} />

        {/* ----------------- DIALOG 1: RAISE A REFERRAL ----------------- */}
        {dialog.type === "referral" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Raise a referral
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Next step is created in her chain and visible to the receiving facility (NS-4).
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {facilities.map((fac) => {
                const isSelected = selectedFacility === fac.id;
                return (
                  <button
                    key={fac.id}
                    onClick={() => setSelectedFacility(fac.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "12px 14px",
                      border: isSelected ? `2px solid var(--ml-blue)` : "1.5px solid #ECEAE4",
                      borderRadius: 14,
                      background: isSelected ? "#F3F2FF" : "#FFFFFF",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit"
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: isSelected ? `5px solid var(--ml-blue)` : "2px solid #C4C2BC",
                      background: "#FFF",
                      flexShrink: 0
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>
                        {fac.level}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--ml-ink-500)", marginTop: 1 }}>
                        {fac.name}
                      </span>
                    </div>

                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: fac.tone,
                      background: "#FAF9F6",
                      padding: "2px 6px",
                      borderRadius: 4
                    }}>
                      {fac.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={async () => {
                const f = facilities.find((x) => x.id === selectedFacility) || facilities[0];
                await onConfirmReferral(f.id, f.name);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Confirm Referral
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 2: SCHEDULE ANC VISIT ----------------- */}
        {dialog.type === "anc_visit" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Schedule ANC visit
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Set interval for her next antenatal care encounter.
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { label: "+2 weeks", days: 14 },
                { label: "+4 weeks", days: 28 },
                { label: "+6 weeks", days: 42 },
              ].map((q) => {
                const target = addDays(q.days);
                const isSelected = ancDate === target;
                return (
                  <button
                    key={q.label}
                    onClick={() => setAncDate(target)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 999,
                      border: isSelected ? "1.5px solid var(--ml-blue)" : "1.5px solid #DEDDD8",
                      background: isSelected ? "#EFEDFF" : "#FFF",
                      color: isSelected ? "#1E14BE" : "var(--ml-ink-700)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--ml-ink-500)", marginBottom: 6 }}>
              Visit Date
            </label>
            <input
              type="date"
              value={ancDate}
              onChange={(e) => setAncDate(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #DEDDD8",
                borderRadius: 14,
                background: "#FAF9F6",
                fontSize: 15,
                fontFamily: "inherit",
                color: "var(--ml-ink-900)",
                marginBottom: 12,
                outline: "none"
              }}
            />

            <div style={{
              background: "#EFEDFF",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 12,
              color: "#1E14BE",
              lineHeight: 1.45,
              marginBottom: 14
            }}>
              Scheduled for <strong>{ancDate}</strong> at Sub-centre Ghurehta. Reminders will queue via OpenPHC.
            </div>

            <button
              onClick={async () => {
                await onConfirmAncVisit(ancDate, `Scheduled for ${ancDate} at Sub-centre Ghurehta`);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Submit
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 3: SCHEDULE PMSMA VISIT ----------------- */}
        {dialog.type === "pmsma_visit" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Schedule PMSMA visit
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              She is added to the monthly fixed PMSMA session — no manual date needed.
            </div>

            <div style={{
              border: "1px solid #DEDDD8",
              borderLeft: "4px solid var(--ml-blue)",
              borderRadius: 16,
              padding: "14px 16px",
              background: "#F6F5FF",
              marginBottom: 16
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ml-blue)", marginBottom: 4 }}>
                Next Fixed Session
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ml-ink-900)", letterSpacing: "-0.01em" }}>
                {pmsmaInfo.display}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ml-ink-800)", marginTop: 4 }}>
                PHC Sirmour · Specialist OB/GYN Clinic
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ml-ink-600)", marginTop: 6, lineHeight: 1.4 }}>
                Fixed 9th-of-month national maternal health initiative session. ASHA is notified to escort her.
              </div>
            </div>

            <button
              onClick={async () => {
                await onConfirmPmsmaVisit(pmsmaInfo.iso);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Add to PMSMA session
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 4: ULTRASOUND (USG) ----------------- */}
        {dialog.type === "usg" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Referred to CHC for Ultrasound
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Stage ultrasound at CHC Teonthar with target completion date.
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { label: "+3 days", days: 3 },
                { label: "+1 week", days: 7 },
                { label: "+2 weeks", days: 14 },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setUsgDate(addDays(q.days))}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: usgDate === addDays(q.days) ? "1.5px solid var(--ml-blue)" : "1.5px solid #DEDDD8",
                    background: usgDate === addDays(q.days) ? "#EFEDFF" : "#FFF",
                    color: usgDate === addDays(q.days) ? "#1E14BE" : "var(--ml-ink-700)",
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
              value={usgDate}
              onChange={(e) => setUsgDate(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #DEDDD8",
                borderRadius: 14,
                background: "#FAF9F6",
                fontSize: 15,
                fontFamily: "inherit",
                color: "var(--ml-ink-900)",
                marginBottom: 14,
                outline: "none"
              }}
            />

            <button
              onClick={async () => {
                await onConfirmUsg(usgDate);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Submit Ultrasound Order
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 5: ASHA PNC REFERRAL ----------------- */}
        {dialog.type === "asha_ref" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Refer to a facility (PNC)
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 12 }}>
              Select the mother, the newborn, or both — they can be referred together.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[
                { id: "MOTHER", label: "Mother only", sub: "PNC complications, postpartum hemorrhage, infection" },
                { id: "NEWBORN", label: "Newborn only", sub: "Hypothermia, jaundice, feeding difficulty" },
                { id: "BOTH", label: "Both mother & baby", sub: "Joint referral to hospital" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAshaRefWho(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: ashaRefWho === opt.id ? "1.5px solid #1B6B47" : "1.5px solid #ECEAE4",
                    borderRadius: 12,
                    background: ashaRefWho === opt.id ? "#EBFBF1" : "#FFF",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: ashaRefWho === opt.id ? "4px solid #1B6B47" : "2px solid #C4C2BC",
                    background: "#FFF"
                  }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ml-ink-900)" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--ml-ink-500)" }}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--ml-ink-500)", marginBottom: 6 }}>
              Refer To
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["PHC", "CHC", "DH"].map((fac) => (
                <button
                  key={fac}
                  onClick={() => setAshaRefFac(fac)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: ashaRefFac === fac ? "1.5px solid var(--ml-blue)" : "1.5px solid #ECEAE4",
                    background: ashaRefFac === fac ? "#EFEDFF" : "#FFF",
                    color: ashaRefFac === fac ? "#1E14BE" : "var(--ml-ink-700)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer"
                  }}
                >
                  {fac}
                </button>
              ))}
            </div>

            <button
              onClick={async () => {
                await onConfirmAshaRef(ashaRefWho, ashaRefFac);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "#1B6B47",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Confirm PNC Referral
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 6: SCHEDULE HBNC VISITS ----------------- */}
        {dialog.type === "hbnc" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Schedule HBNC visits
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 12 }}>
              Home-based newborn care protocol (Days 1, 3, 7, 14, 21, 28, 42).
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "35vh", overflowY: "auto", marginBottom: 14 }}>
              {[1, 3, 7, 14, 21, 28, 42].map((day) => {
                const target = addDays(day);
                return (
                  <div
                    key={day}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "#F8F7F4",
                      borderRadius: 10,
                      fontSize: 13
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--ml-ink-800)" }}>
                      Day {day} Home Visit
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--ml-ink-500)" }}>
                      Due: {target}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={async () => {
                await onConfirmHbnc(hbncDates);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "#1B6B47",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Add 7 HBNC Visits
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 7: STEP ACTION SHEET (ASHA / FIELD) ----------------- */}
        {dialog.type === "action_sheet" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid #ECEAE4", marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EFEDFF", color: "#1E14BE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                  {dialog.step.category.replace("_", " ")}
                </div>
                <div style={{ fontSize: 12, color: "var(--ml-ink-500)" }}>
                  For {dialog.woman.name} · Due {dialog.step.dueDate}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {/* Mark Complete */}
              <button
                onClick={() => onOpenDialog({ type: "close_step", woman: dialog.woman, step: dialog.step })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1.5px solid #8FD3B2",
                  background: "#F2FBF6",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#D9F7E8", color: "#1B6B47", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>Mark complete</div>
                  <div style={{ fontSize: 11, color: "var(--ml-ink-500)" }}>Record where and how care was delivered</div>
                </div>
                <ChevronRight size={16} color="#8FD3B2" />
              </button>

              {/* Send SMS / WhatsApp Nudge */}
              <button
                onClick={() => onOpenDialog({ type: "sms_preview", woman: dialog.woman, step: dialog.step })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #ECEAE4",
                  background: "#FFF",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#E8F8EE", color: "#1B6B47", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageCircle size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>Send reminder nudge</div>
                  <div style={{ fontSize: 11, color: "var(--ml-ink-500)" }}>DLT SMS in Hindi · Quiet hours 9am–7pm</div>
                </div>
                <ChevronRight size={16} color="var(--ml-ink-400)" />
              </button>

              {/* Call Client */}
              <a
                href={`tel:${dialog.woman.phone}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #ECEAE4",
                  background: "#FFF",
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FDF0E8", color: "#C35721", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Phone size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>Call {dialog.woman.phone}</div>
                  <div style={{ fontSize: 11, color: "var(--ml-ink-500)" }}>Direct field phone contact</div>
                </div>
                <ChevronRight size={16} color="var(--ml-ink-400)" />
              </a>

              {/* Reschedule */}
              <button
                onClick={() => onOpenDialog({ type: "reschedule", woman: dialog.woman, step: dialog.step })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #ECEAE4",
                  background: "#FFF",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#EFEDFF", color: "#1E14BE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>Reschedule due date</div>
                  <div style={{ fontSize: 11, color: "var(--ml-ink-500)" }}>Extend follow-up window if she plans to go later</div>
                </div>
                <ChevronRight size={16} color="var(--ml-ink-400)" />
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  await onCompleteStep(dialog.step.id, "DOES_NOT_WANT_TO_GO");
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "#FBEDE4",
                  color: "#C35721",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                She declined
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: "1.5px solid #DEDDD8",
                  background: "#FFF",
                  color: "var(--ml-ink-800)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ----------------- DIALOG 8: MARK COMPLETE (WHERE DID CARE HAPPEN?) ----------------- */}
        {dialog.type === "close_step" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#D9F7E8", color: "#1B6B47", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                  Mark complete
                </div>
                <div style={{ fontSize: 12, color: "var(--ml-ink-500)" }}>
                  {dialog.step.category.replace("_", " ")} · {dialog.woman.name}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ml-ink-600)", marginBottom: 8 }}>
              WHERE DID CARE ACTUALLY HAPPEN?
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[
                { id: "COMPLETED_REFERRED_PUBLIC", label: "At the referred facility", hint: "Service delivered at the facility she was sent to" },
                { id: "COMPLETED_OTHER_PUBLIC", label: "At another public facility", hint: "A different government facility (PHC, CHC, etc.)" },
                { id: "COMPLETED_PRIVATE", label: "At a private provider", hint: "She used private care clinic or nursing home" },
              ].map((opt) => {
                const isSelected = selectedOutcome === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOutcome(opt.id as TrackingOutcomeType)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 14px",
                      borderRadius: 14,
                      border: isSelected ? "2px solid #1B6B47" : "1.5px solid #ECEAE4",
                      background: isSelected ? "#F3FAF5" : "#FFF",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: isSelected ? "5px solid #1B6B47" : "2px solid #C4C2BC",
                      background: "#FFF",
                      flexShrink: 0
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ml-ink-900)" }}>{opt.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)", marginTop: 1 }}>{opt.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)", marginBottom: 14, lineHeight: 1.45 }}>
              Records <strong>who</strong> completed it, <strong>where</strong>, and the outcome — visible to every level in her chain (FR-F-7).
            </div>

            <button
              onClick={async () => {
                await onCompleteStep(dialog.step.id, selectedOutcome);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "#2E9E6B",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Confirm complete
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 9: DLT SMS REMINDER PREVIEW ----------------- */}
        {dialog.type === "sms_preview" && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 2 }}>
              Reminder preview
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              DLT-registered SMS · Hindi · to {dialog.woman.name} ({dialog.woman.phone})
            </div>

            <div style={{
              background: "#F3F2FF",
              borderRadius: "16px 16px 16px 4px",
              padding: "14px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--ml-ink-900)",
              marginBottom: 8
            }}>
              नमस्ते {dialog.woman.name} जी। आपकी अगली {dialog.step.category.replace("_", " ")} जाँच PHC पर {dialog.step.dueDate} को निर्धारित है। कृपया समय पर पहुँचें। — स्वास्थ्य विभाग
            </div>

            <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)", fontStyle: "italic", lineHeight: 1.45, marginBottom: 14 }}>
              "Hello {dialog.woman.name}. Your next visit is due on {dialog.step.dueDate}. Please attend on time. — Health Dept."
            </div>

            <div style={{ display: "flex", gap: 8, fontSize: 11, marginBottom: 16 }}>
              <span style={{ background: "#D9F7E8", color: "#1B6B47", fontWeight: 700, borderRadius: 6, padding: "3px 8px" }}>
                Quiet hours 9am–7pm
              </span>
              <span style={{ background: "#EAE8E2", color: "var(--ml-ink-800)", fontWeight: 700, borderRadius: 6, padding: "3px 8px" }}>
                1 / step / day limit
              </span>
            </div>

            <button
              onClick={async () => {
                await onSendSms(dialog.step.id, `SMS to ${dialog.woman.name}`);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Send nudge now
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 10: SCAN ABHA QR SIMULATOR ----------------- */}
        {dialog.type === "scan_qr" && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 2 }}>
              Scan ABHA QR
            </div>
            <div style={{ fontSize: 12, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Point at the QR on her MCP card or printed ABHA document.
            </div>

            <div style={{
              width: "100%",
              aspectRatio: "1.2",
              background: "#0B0B12",
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              marginBottom: 16
            }}>
              <div style={{ position: "absolute", inset: 24, border: "2px solid rgba(255,255,255,0.3)", borderRadius: 12 }} />
              <div style={{ position: "absolute", left: 24, right: 24, height: 2, background: "#2E9E6B", boxShadow: "0 0 12px #2E9E6B" }} />
              <QrCode size={80} color="rgba(255,255,255,0.4)" />
            </div>

            <button
              onClick={() => {
                onScanResult("pw_01"); // Simulates scanning Sunita Devi
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Simulate Scan → Find Her Record
            </button>
          </div>
        )}

        {/* ----------------- DIALOG 11: RESCHEDULE DUE DATE ----------------- */}
        {dialog.type === "reschedule" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)", marginBottom: 3 }}>
              Reschedule due date
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              {dialog.step.category.replace("_", " ")} · {dialog.woman.name}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { label: "+1 week", days: 7 },
                { label: "+2 weeks", days: 14 },
                { label: "+4 weeks", days: 28 },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setReschedDate(addDays(q.days))}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: reschedDate === addDays(q.days) ? "1.5px solid var(--ml-blue)" : "1.5px solid #DEDDD8",
                    background: reschedDate === addDays(q.days) ? "#EFEDFF" : "#FFF",
                    color: reschedDate === addDays(q.days) ? "#1E14BE" : "var(--ml-ink-700)",
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
              value={reschedDate}
              onChange={(e) => setReschedDate(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #DEDDD8",
                borderRadius: 14,
                background: "#FAF9F6",
                fontSize: 15,
                fontFamily: "inherit",
                color: "var(--ml-ink-900)",
                marginBottom: 14,
                outline: "none"
              }}
            />

            <button
              onClick={async () => {
                await onRescheduleStep(dialog.step.id, reschedDate);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Save new date
            </button>
          </div>
        )}

        {/* ----------------- DIALOG: BLOOD / LAB TEST ----------------- */}
        {dialog.type === "lab_test" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                Blood / Lab Investigation
              </div>
              <button 
                onClick={onClose}
                style={{ border: "none", background: "#F1EFE9", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ml-ink-500)" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ml-ink-500)", marginBottom: 14 }}>
              Schedule lab investigations for <strong>{dialog.woman.name}</strong> ({dialog.woman.village})
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Investigation Type
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {[
                { name: "Hemoglobin (Hb) Check", sub: "Anemia surveillance · Point of care", tone: "#994242" },
                { name: "Blood Sugar / Oral Glucose Tolerance (OGTT)", sub: "Gestational diabetes screening", tone: "#C35721" },
                { name: "Urine Albumin & Sugar", sub: "Pre-eclampsia & protein surveillance", tone: "#1E14BE" },
                { name: "Viral Markers (HIV, Syphilis, HBsAg)", sub: "Mandatory triple screening panel", tone: "#1B6B47" },
                { name: "Blood Grouping & Rh Factor", sub: "Cross-matching preparedness", tone: "#6165DE" },
              ].map((test) => (
                <div
                  key={test.name}
                  onClick={() => setSelectedLabTest(test.name)}
                  style={{
                    padding: "11px 13px",
                    borderRadius: 13,
                    border: selectedLabTest === test.name ? "1.8px solid var(--ml-blue)" : "1px solid #ECEAE4",
                    background: selectedLabTest === test.name ? "#EFEDFF" : "#FAF9F6",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ml-ink-900)" }}>{test.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ml-ink-500)", marginTop: 2 }}>{test.sub}</div>
                  </div>
                  {selectedLabTest === test.name && <Check size={18} color="var(--ml-blue)" />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Due Date
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
              {[
                { label: "+3 days", d: addDays(3) },
                { label: "+1 week", d: addDays(7) },
                { label: "+2 weeks", d: addDays(14) },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => setLabDate(q.d)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: labDate === q.d ? "1.5px solid var(--ml-blue)" : "1px solid #DEDDD8",
                    borderRadius: 10,
                    background: labDate === q.d ? "#EFEDFF" : "#FFF",
                    color: labDate === q.d ? "var(--ml-blue)" : "var(--ml-ink-700)",
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
              value={labDate}
              onChange={(e) => setLabDate(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 13px",
                border: "1.5px solid #DEDDD8",
                borderRadius: 12,
                background: "#FAF9F6",
                fontSize: 14,
                fontFamily: "inherit",
                color: "var(--ml-ink-900)",
                marginBottom: 16,
                outline: "none"
              }}
            />

            <button
              onClick={async () => {
                if (onConfirmLabTest) {
                  await onConfirmLabTest(selectedLabTest, labDate);
                }
                onClose();
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "var(--ml-blue)",
                color: "#FFF",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Confirm investigation step
            </button>
          </div>
        )}

        {/* ----------------- DIALOG: PUBLIC HEALTH PROFILE ----------------- */}
        {dialog.type === "profile" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                Public Health Profile
              </div>
              <button 
                onClick={onClose}
                style={{ border: "none", background: "#F1EFE9", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ml-ink-500)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Indigo hero band */}
            <div style={{
              background: "#1E14BE",
              borderRadius: 18,
              padding: "16px 16px",
              color: "#FFF",
              marginBottom: 14,
              boxShadow: "0 6px 16px rgba(30,20,190,0.18)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#FFF"
                }}>
                  {dialog.woman.name.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#FFF" }}>{dialog.woman.name}</span>
                    {dialog.woman.nameHi && (
                      <span style={{ fontSize: 13, color: "#D7D4FA" }}>{dialog.woman.nameHi}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#B6B1EE", marginTop: 2 }}>
                    {dialog.woman.age || 23}y · 📍 {dialog.woman.village} · ABHA {dialog.woman.abhaId || "91-8234-1123-9081"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                <span style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#FFF",
                  padding: "4px 9px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  📞 {dialog.woman.phone}
                </span>
                <span style={{
                  background: dialog.woman.status === "HRP" ? "#994242" : "#2E9E6B",
                  color: "#FFF",
                  padding: "4px 9px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 800
                }}>
                  {dialog.woman.status === "HRP" ? `⚠️ HRP · ${dialog.woman.riskReason || "High Risk"}` : "✓ Routine"}
                </span>
                <span style={{
                  background: "rgba(84,204,144,0.22)",
                  color: "#A2F0C6",
                  padding: "4px 9px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  ✓ SMS Reminders Active
                </span>
              </div>
            </div>

            {/* Continuum of Care Grid */}
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Continuous Care Pathway (ANC → PNC → NCD)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
              {/* ANC Section */}
              <div style={{ border: "1px solid #ECEAE4", borderRadius: 14, padding: "12px 14px", background: "#FAF9F6" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ml-blue)" }}>ANTENATAL CARE (ANC)</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2E9E6B", background: "#E8F7F0", padding: "2px 7px", borderRadius: 6 }}>Active</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div><strong>LMP:</strong> {dialog.woman.lmpDate || "2026-02-01"}</div>
                  <div><strong>Gestation:</strong> 28w 4d</div>
                  <div><strong>EDD:</strong> 14 Nov 2026</div>
                  <div><strong>Hb / BP:</strong> 7.2 g/dL · 118/76</div>
                  <div><strong>TT / Td:</strong> Dose 1 & 2 done</div>
                  <div><strong>IFA / Calcium:</strong> 180 tablets issued</div>
                </div>
              </div>

              {/* PNC Section */}
              <div style={{ border: "1px solid #ECEAE4", borderRadius: 14, padding: "12px 14px", background: "#FAF9F6" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#188673" }}>POSTNATAL CARE (PNC)</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ml-ink-400)" }}>Planned</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ml-ink-700)" }}>
                  Institutional Delivery planned at <strong>PHC Sirmour</strong>. Linked to 108 Emergency Transport & JSY entitlement. 7 Home Based Newborn Care (HBNC) visits scheduled for ASHA {dialog.woman.ashaName}.
                </div>
              </div>

              {/* NCD Section */}
              <div style={{ border: "1px solid #ECEAE4", borderRadius: 14, padding: "12px 14px", background: "#FAF9F6" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#C35721" }}>NCD & POPULATION HEALTH</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ml-ink-400)" }}>Surveillance</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ml-ink-700)" }}>
                  Baseline Hypertension & Diabetes screening logged at SC-HWC Ghurehta. Next screening due post-puerperium (6 weeks postpartum).
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "13px",
                border: "1.5px solid #DEDDD8",
                borderRadius: 14,
                background: "#FFF",
                color: "var(--ml-ink-700)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Close Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
