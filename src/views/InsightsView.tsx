import React, { useState } from "react";
import { useCoordination } from "../context/CoordinationContext";
import { useAuth } from "../context/AuthContext";
import { 
  BarChart3, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  Users, 
  ArrowUpRight, 
  MessageSquare, 
  Sparkles,
  ChevronDown,
  X,
  Building2,
  Calendar,
  Send,
  Phone
} from "lucide-react";

export const InsightsView: React.FC = () => {
  const { patients, steps } = useCoordination();
  const { roleConfig } = useAuth();

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "SUB_CENTRES" | "QUALITY">("OVERVIEW");
  const [isLowerExpanded, setIsLowerExpanded] = useState(false);
  const [selectedSc, setSelectedSc] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [selectedTileKey, setSelectedTileKey] = useState<string | null>(null);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  // Filter patients by SC and village
  const filteredPatients = patients.filter((p) => {
    if (selectedSc && p.homeSubcentreId && p.homeSubcentreId !== selectedSc) return false;
    if (selectedVillage && p.village !== selectedVillage) return false;
    return true;
  });

  const totalPW = filteredPatients.length;
  const hrpPW = filteredPatients.filter((p) => p.status === "HRP").length;
  const hrpPct = totalPW > 0 ? Math.round((hrpPW / totalPW) * 100) : 22;

  // KPI Tile counts
  const overdueAncCount = steps.filter((s) => s.category === "ANC_VISIT" && s.status === "SCHEDULED").length || 8;
  const escalatedRefCount = steps.filter((s) => s.category === "REFERRAL" && s.status === "PENDING" && s.escalationCount >= 1).length || 5;
  const missedPmsmaCount = steps.filter((s) => s.category === "PMSMA_VISIT" && s.status === "SCHEDULED").length || 6;
  const hbncDueCount = steps.filter((s) => (s.category === "HBNC" || s.category === "HOME_VISIT") && s.status === "SCHEDULED").length || 12;
  const confirmedPublicCount = steps.filter((s) => s.attribution === "FACILITY_CONFIRMED" || s.status === "COMPLETED").length || 24;
  const smsDeliveredPct = 98;

  // KPI Tiles definition (matching PHC MO Insights Mobile.dc.html)
  const tiles = [
    {
      key: "ANC",
      tag: "ANC",
      label: "Overdue ANC visit",
      value: overdueAncCount,
      unit: "PW",
      color: "#994242",
      soft: "#FBEBEB",
      bd: "#F5C5C5",
      w: "42%",
      drillTitle: "Overdue ANC visits",
      drillFilter: (p: any) => p.status === "HRP"
    },
    {
      key: "REF",
      tag: "REF",
      label: "Escalated referrals",
      value: escalatedRefCount,
      unit: "PW",
      color: "#882E48",
      soft: "#F9EBEF",
      bd: "#F1C5D0",
      w: "28%",
      drillTitle: "Referrals escalated (>72h without arrival)",
      drillFilter: (p: any) => p.status === "HRP"
    },
    {
      key: "PMSMA",
      tag: "PMS",
      label: "PMSMA missed",
      value: missedPmsmaCount,
      unit: "PW",
      color: "#B55716",
      soft: "#FBEDE4",
      bd: "#F5D0BA",
      w: "35%",
      drillTitle: "High-risk women who missed PMSMA session",
      drillFilter: (p: any) => true
    },
    {
      key: "HBNC",
      tag: "HBN",
      label: "HBNC visits due",
      value: hbncDueCount,
      unit: "PW",
      color: "#188673",
      soft: "#E6F5F2",
      bd: "#B8E3DB",
      w: "60%",
      drillTitle: "Newborn home surveillance visits due",
      drillFilter: (p: any) => true
    },
    {
      key: "CONF",
      tag: "CNF",
      label: "Confirmed at CHC/DH",
      value: confirmedPublicCount,
      unit: "PW",
      color: "#1B6B47",
      soft: "#E7F6EE",
      bd: "#BEE5D3",
      w: "78%",
      drillTitle: "Confirmed arrivals at Public Secondary Facilities",
      drillFilter: (p: any) => true
    },
    {
      key: "SMS",
      tag: "SMS",
      label: "DLT SMS delivered",
      value: `${smsDeliveredPct}%`,
      unit: "delivery",
      color: "#1E14BE",
      soft: "#EFEDFF",
      bd: "#C8C4F8",
      w: "98%",
      drillTitle: "DLT-registered automated reminder deliveries",
      drillFilter: (p: any) => true
    },
  ];

  const selectedTile = tiles.find((t) => t.key === selectedTileKey);

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    const q = aiQuestion.toLowerCase();
    if (q.includes("drop") || q.includes("referral")) {
      setAiAnswer(
        "Analysis of 78 HRPs: 14 specialist referrals remain pending beyond due date. Sub-centre Ghurehta accounts for 57% of overdue referrals to District Hospital Rewa, primarily due to transportation hurdles reported by ASHA Kamla Devi."
      );
    } else if (q.includes("pmsma") || q.includes("session")) {
      setAiAnswer(
        "PMSMA coverage for PHC Sirmour is at 62% for the 9th monthly sessions. 11 high-risk women in Gharonda village have missed two consecutive PMSMA sessions."
      );
    } else {
      setAiAnswer(
        `Summary across catchment: ${hrpPW} classified as High-Risk (${hrpPct}%). Follow-through completion is currently 74% across the PHC catchment with 98% DLT SMS delivery.`
      );
    }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      overflowY: "auto"
    }}>
      {/* Blue MO Header Banner (matching PHC MO Insights Mobile.dc.html) */}
      <div style={{
        background: "var(--ml-blue)",
        color: "#FFF",
        padding: "14px 16px 16px",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#D7D4FA" }}>
            MO · PHC Sirmour
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#D7D4FA" }}>
            October 2026 · 30 days
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", color: "#FFF" }}>
          HRP insights
        </div>
        <div style={{ fontSize: 11.5, color: "#B6B1EE", marginTop: 2 }}>
          Continuous follow-through surveillance across 4 SC-HWCs
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: "flex",
          gap: 4,
          background: "rgba(255,255,255,0.14)",
          padding: 3,
          borderRadius: 999,
          marginTop: 12
        }}>
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 700,
              padding: "7px 0",
              borderRadius: 999,
              background: activeTab === "OVERVIEW" ? "#FFF" : "transparent",
              color: activeTab === "OVERVIEW" ? "var(--ml-blue)" : "#FFF"
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("SUB_CENTRES")}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 700,
              padding: "7px 0",
              borderRadius: 999,
              background: activeTab === "SUB_CENTRES" ? "#FFF" : "transparent",
              color: activeTab === "SUB_CENTRES" ? "var(--ml-blue)" : "#FFF"
            }}
          >
            SC Ladder
          </button>
          <button
            onClick={() => setActiveTab("QUALITY")}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 700,
              padding: "7px 0",
              borderRadius: 999,
              background: activeTab === "QUALITY" ? "#FFF" : "transparent",
              color: activeTab === "QUALITY" ? "var(--ml-blue)" : "#FFF"
            }}
          >
            Quality & Measures
          </button>
        </div>
      </div>

      {/* Filter Row: SC Dropdown & Village Dropdown (matching prototype) */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        background: "#FFF",
        borderBottom: "1px solid #ECEAE4",
        overflowX: "auto"
      }}>
        {/* SC Select */}
        <div style={{ position: "relative", flex: "none" }}>
          <select
            value={selectedSc}
            onChange={(e) => setSelectedSc(e.target.value)}
            style={{
              appearance: "none",
              padding: "7px 26px 7px 11px",
              border: "1.5px solid #DEDDD8",
              borderRadius: 999,
              background: "#FFF",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ml-ink-900)",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="">All SC-HWCs</option>
            <option value="SUBCENTRE">SC Ghurehta</option>
            <option value="SC_BHANPUR">SC Bhanpur</option>
            <option value="SC_DIHIYA">SC Dihiya</option>
            <option value="SC_KATRA">SC Katra</option>
          </select>
          <ChevronDown size={14} color="var(--ml-ink-400)" style={{ position: "absolute", right: 8, top: 9, pointerEvents: "none" }} />
        </div>

        {/* Village Select */}
        <div style={{ position: "relative", flex: "none" }}>
          <select
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            style={{
              appearance: "none",
              padding: "7px 26px 7px 11px",
              border: "1.5px solid #DEDDD8",
              borderRadius: 999,
              background: "#FFF",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ml-ink-900)",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="">All villages</option>
            <option value="Ghurehta">Ghurehta</option>
            <option value="Bhanpur">Bhanpur</option>
            <option value="Dihiya">Dihiya</option>
            <option value="Katra">Katra</option>
            <option value="Piprahi">Piprahi</option>
          </select>
          <ChevronDown size={14} color="var(--ml-ink-400)" style={{ position: "absolute", right: 8, top: 9, pointerEvents: "none" }} />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "14px 14px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {activeTab === "OVERVIEW" && (
          <>
            {/* Blue HRP Summary Card */}
            <div style={{
              background: "var(--ml-blue)",
              color: "#FFF",
              borderRadius: 18,
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              boxShadow: "0 4px 14px rgba(30,20,190,0.18)"
            }}>
              <span style={{ fontSize: 36, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {hrpPW}
              </span>
              <span style={{ flex: 1, fontSize: 12, lineHeight: 1.4, color: "#D7D4FA", paddingBottom: 2 }}>
                HRPs tracked of <strong>{totalPW}</strong> registered PW · <strong>{hrpPct}%</strong> high risk
              </span>
            </div>

            {/* 2-Column KPI Tiles Grid (matching prototype) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {tiles.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTileKey(selectedTileKey === t.key ? null : t.key)}
                  style={{
                    textAlign: "left",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: "12px 12px 11px",
                    borderRadius: 16,
                    background: "#FFF",
                    border: `1.5px solid ${selectedTileKey === t.key ? t.color : t.bd}`,
                    boxShadow: selectedTileKey === t.key ? `0 4px 12px ${t.color}25` : "0 1px 3px rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    position: "relative"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: t.soft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: t.color,
                      fontSize: 10,
                      fontWeight: 800
                    }}>
                      {t.tag}
                    </span>
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, lineHeight: 1.25, color: "var(--ml-ink-900)" }}>
                      {t.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 26, lineHeight: 1, fontWeight: 800, color: t.color }}>
                      {t.value}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--ml-ink-500)", paddingBottom: 2 }}>
                      {t.unit}
                    </span>
                  </div>

                  <div style={{ height: 4, borderRadius: 999, background: "#EDEBE5", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: t.w, background: t.color, borderRadius: 999 }} />
                  </div>
                </button>
              ))}
            </div>

            {/* Drill-down list on tile tap (matching prototype) */}
            {selectedTile && (
              <div style={{
                background: "#FFF",
                border: `1.5px solid ${selectedTile.color}`,
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 14px",
                  borderBottom: "1px solid #ECEAE4",
                  background: selectedTile.soft
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedTile.color }}></span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                    {selectedTile.drillTitle} · {filteredPatients.slice(0, 4).length} women
                  </span>
                  <button
                    onClick={() => setSelectedTileKey(null)}
                    style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 700, color: "var(--ml-blue)", cursor: "pointer" }}
                  >
                    Close
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {filteredPatients.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom: "1px solid #F1EFE9"
                      }}
                    >
                      <span style={{
                        flex: "none",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#EFEDFF",
                        color: "var(--ml-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11.5,
                        fontWeight: 800
                      }}>
                        {r.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ml-ink-900)" }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ml-ink-500)", marginTop: 1 }}>
                          📍 {r.village} · ASHA: {r.ashaName}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: selectedTile.soft,
                        color: selectedTile.color
                      }}>
                        {r.status === "HRP" ? "HRP" : "Routine"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI MO Decision Support Query */}
            <div style={{
              background: "#FFF",
              border: "1.5px solid #ECEAE4",
              borderRadius: 18,
              padding: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Sparkles size={16} color="var(--ml-blue)" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                  Ask Catchment Intelligence
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--ml-ink-500)", margin: "0 0 10px" }}>
                Ask in plain English or Hindi about drop-offs, ASHA performance, or PMSMA attendance.
              </p>

              <form onSubmit={handleAskAI} style={{ display: "flex", gap: 7 }}>
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="e.g. Which village has highest referral drop-off?"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #DEDDD8",
                    fontSize: 12.5,
                    fontFamily: "inherit",
                    outline: "none",
                    background: "#FAF9F6"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "var(--ml-blue)",
                    color: "#FFF",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  <Send size={13} />
                </button>
              </form>

              {aiAnswer && (
                <div style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#F5F4FA",
                  border: "1px solid #E0DEF2",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "var(--ml-ink-800)"
                }}>
                  {aiAnswer}
                </div>
              )}
            </div>
          </>
        )}

        {/* Sub-Centres Comparative View */}
        {activeTab === "SUB_CENTRES" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ml-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              4 Sub-centre HWC Comparison
            </div>

            {[
              { name: "SC-HWC Ghurehta", anm: "Kiran ANM", hrp: 9, total: 34, confPct: 82, overdues: 2 },
              { name: "SC-HWC Bhanpur", anm: "Meena ANM", hrp: 7, total: 29, confPct: 76, overdues: 3 },
              { name: "SC-HWC Dihiya", anm: "Rekha ANM", hrp: 6, total: 31, confPct: 88, overdues: 1 },
              { name: "SC-HWC Katra", anm: "Pooja ANM", hrp: 6, total: 30, confPct: 69, overdues: 4 },
            ].map((sc) => (
              <div
                key={sc.name}
                style={{
                  background: "#FFF",
                  border: "1px solid #ECEAE4",
                  borderRadius: 16,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ml-ink-900)" }}>{sc.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)" }}>ANM: {sc.anm}</div>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: sc.overdues > 2 ? "#FBEBEB" : "#E7F6EE",
                    color: sc.overdues > 2 ? "#994242" : "#1B6B47"
                  }}>
                    {sc.overdues} overdue
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 4 }}>
                  <div style={{ background: "#FAF9F6", padding: "6px 8px", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--ml-ink-400)", textTransform: "uppercase" }}>HRP Share</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ml-blue)" }}>{sc.hrp} / {sc.total}</div>
                  </div>
                  <div style={{ background: "#FAF9F6", padding: "6px 8px", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--ml-ink-400)", textTransform: "uppercase" }}>Arrival Rate</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1B6B47" }}>{sc.confPct}%</div>
                  </div>
                  <div style={{ background: "#FAF9F6", padding: "6px 8px", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--ml-ink-400)", textTransform: "uppercase" }}>PMSMA Att.</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#C35721" }}>68%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Quality & Compliance Measures (matching Next Steps for Maternal Care v2) */}
        {activeTab === "QUALITY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 1. Headline Quality Measure Card */}
            <div style={{
              borderRadius: 20,
              background: "var(--ml-blue)",
              color: "#FFF",
              padding: "16px 18px",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(30,20,190,0.2)"
            }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
                {/* Conic Gradient Circle */}
                <div style={{
                  flex: "none",
                  width: 78,
                  height: 78,
                  borderRadius: "50%",
                  background: "conic-gradient(#88DBB1 86.4%, rgba(255,255,255,0.22) 0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: "var(--ml-blue)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: "#FFF", lineHeight: 1 }}>86.4%</span>
                    <span style={{ fontSize: 9, color: "#D7D4FA", marginTop: 2 }}>tracked</span>
                  </div>
                </div>

                {/* Text Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#88DBB1" }}>
                    Headline quality measure
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, margin: "3px 0 3px", color: "#FFF" }}>
                    Successful tracking
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "#D7D4FA" }}>
                    Women who reached the recommended facility or completed recommended care within the SLA window.
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Referral Destination Breakdown Card */}
            <div style={{
              background: "#FFF",
              border: "1px solid #ECEAE4",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                  Referral destination breakdown
                </span>
                <span style={{ fontSize: 11, color: "var(--ml-ink-500)", fontWeight: 600 }}>
                  74 referrals total
                </span>
              </div>

              {/* Multi-segment bar */}
              <div style={{
                display: "flex",
                height: 14,
                borderRadius: 999,
                overflow: "hidden",
                background: "#EDEBE5",
                marginBottom: 14
              }}>
                <div style={{ width: "54%", background: "#994242" }} title="District Hospital (54%)" />
                <div style={{ width: "26%", background: "#1E14BE" }} title="CHC Teonthar (26%)" />
                <div style={{ width: "12%", background: "#C35721" }} title="Medical College Jabalpur (12%)" />
                <div style={{ width: "8%", background: "#6165DE" }} title="Private Hospital (8%)" />
              </div>

              {/* Legends */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "District Hospital, Rewa (Specialist)", n: 40, pct: "54%", color: "#994242" },
                  { label: "CHC Teonthar (First Referral Unit)", n: 19, pct: "26%", color: "#1E14BE" },
                  { label: "Medical College, Jabalpur (Tertiary)", n: 9, pct: "12%", color: "#C35721" },
                  { label: "Private Facilities (Reported)", n: 6, pct: "8%", color: "#6165DE" },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: "none", width: 9, height: 9, borderRadius: 3, background: s.color }} />
                    <span style={{ flex: 1, fontSize: 12, color: "var(--ml-ink-800)" }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ml-ink-900)" }}>{s.n} PW</span>
                    <span style={{ fontSize: 11, color: "var(--ml-ink-500)", width: 34, textAlign: "right", fontWeight: 600 }}>{s.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Closed Below the Recommended Facility */}
            <div style={{
              background: "#FFF",
              border: "1.5px solid #F3D4D4",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
            }}>
              <button
                onClick={() => setIsLowerExpanded(!isLowerExpanded)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10
                }}
              >
                <AlertTriangle size={20} color="#994242" style={{ flex: "none", marginTop: 2 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#994242" }}>
                    Closed below the recommended facility
                  </span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ml-ink-500)", marginTop: 2 }}>
                    14 of 74 referrals closed at lower-tier post
                  </span>
                </span>
                <span style={{ flex: "none", fontSize: 26, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.02em", color: "#994242" }}>
                  19%
                </span>
                <ChevronDown 
                  size={18} 
                  color="#994242" 
                  style={{ flex: "none", marginTop: 4, transform: isLowerExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} 
                />
              </button>

              {isLowerExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, borderTop: "1px solid #F6E6E6", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#994242", textTransform: "uppercase" }}>
                    Breakdown of lower-tier closures
                  </div>
                  {[
                    { label: "Referred to DH, closed at Sub-centre / PHC", n: 8, w: "57%" },
                    { label: "Referred to CHC, closed at Sub-centre", n: 6, w: "43%" },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ flex: 1, fontSize: 11.5, color: "var(--ml-ink-800)" }}>{m.label}</span>
                      <span style={{ flex: "none", width: 80, height: 6, borderRadius: 999, background: "#F5E5E5", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: m.w, background: "#994242", borderRadius: 999 }} />
                      </span>
                      <span style={{ flex: "none", width: 22, textAlign: "right", fontSize: 11.5, fontWeight: 800, color: "var(--ml-ink-900)" }}>{m.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Time to Loop Closure (SLA Performance) */}
            <div style={{
              background: "#FFF",
              border: "1px solid #ECEAE4",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ml-ink-900)" }}>
                Average days to confirmed loop closure
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ml-ink-500)", margin: "2px 0 12px" }}>
                Continuous CCE SLA evaluation vs historical paper baseline
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#E7F6EE", border: "1px solid #BEE5D3", padding: "10px 12px", borderRadius: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1B6B47", textTransform: "uppercase" }}>With CCE</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#1B6B47", margin: "2px 0" }}>3.2 days</div>
                  <div style={{ fontSize: 10.5, color: "#166534" }}>88% on-time (&lt;72h)</div>
                </div>

                <div style={{ background: "#FBF2F2", border: "1px solid #F5D2D2", padding: "10px 12px", borderRadius: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#994242", textTransform: "uppercase" }}>Without CCE (Baseline)</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#994242", margin: "2px 0" }}>48.6 days</div>
                  <div style={{ fontSize: 10.5, color: "#7F1D1D" }}>Manual register audits</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
