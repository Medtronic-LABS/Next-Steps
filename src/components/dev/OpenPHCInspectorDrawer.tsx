import React, { useState, useEffect } from "react";
import { useCoordination } from "../../context/CoordinationContext";
import { useAuth } from "../../context/AuthContext";
import { outboxManager } from "../../openphc/outboxManager";
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Server, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Phone, 
  Zap, 
  Layers, 
  Activity, 
  Clock, 
  Send,
  Building2,
  BellRing,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface OpenPHCInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrawerTab = "SIMULATION" | "BENEFITS" | "ADAPTORS" | "CLOUDEVENTS";

interface SimulationState {
  stage: number; // 0: Idle, 1: Created, 2: Breached, 3: Dispatched, 4: Loop Closed
  autoPlaying: boolean;
  lastEventId?: string;
  slaElapsedHours: number;
  slaStatus: "ON_TRACK" | "BREACHED" | "COMPLETED";
  patientName: string;
  facilityName: string;
  smsStatus: string;
  whatsappStatus: string;
}

export const OpenPHCInspectorDrawer: React.FC<OpenPHCInspectorDrawerProps> = ({ isOpen, onClose }) => {
  const { outbox, syncOutbox, confirmArrival, allSteps, activePatient } = useCoordination();
  const { roleConfig } = useAuth();

  const [activeTab, setActiveTab] = useState<DrawerTab>("SIMULATION");
  const [subTabFormat, setSubTabFormat] = useState<"cloudevent" | "fhir">("cloudevent");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string>(outboxManager.getEndpoint());
  const [syncing, setSyncing] = useState(false);
  const [selectedRoleBenefit, setSelectedRoleBenefit] = useState<"ASHA" | "MO" | "DPO">("ASHA");

  // Interactive CCE Simulation State
  const [sim, setSim] = useState<SimulationState>({
    stage: 1,
    autoPlaying: false,
    lastEventId: "evt_cce_928192",
    slaElapsedHours: 34,
    slaStatus: "ON_TRACK",
    patientName: "Sunita Devi (सुनीता देवी)",
    facilityName: "District Hospital, Rewa",
    smsStatus: "DELIVERED",
    whatsappStatus: "READY"
  });

  // Handle auto-play scenario
  useEffect(() => {
    let timer: any;
    if (sim.autoPlaying) {
      if (sim.stage < 4) {
        timer = setTimeout(() => {
          advanceSimStage(sim.stage + 1);
        }, 3200);
      } else {
        setSim(prev => ({ ...prev, autoPlaying: false }));
      }
    }
    return () => clearTimeout(timer);
  }, [sim.autoPlaying, sim.stage]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    await syncOutbox();
    setSyncing(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const advanceSimStage = (newStage: number) => {
    if (newStage === 1) {
      setSim(prev => ({
        ...prev,
        stage: 1,
        slaElapsedHours: 0,
        slaStatus: "ON_TRACK",
        smsStatus: "SCHEDULED",
        whatsappStatus: "WAITING_FOR_BREACH"
      }));
    } else if (newStage === 2) {
      setSim(prev => ({
        ...prev,
        stage: 2,
        slaElapsedHours: 76,
        slaStatus: "BREACHED",
        smsStatus: "QUEUED_HIGH_PRIORITY",
        whatsappStatus: "TRIGGERED_BREACH"
      }));
    } else if (newStage === 3) {
      setSim(prev => ({
        ...prev,
        stage: 3,
        slaElapsedHours: 76,
        slaStatus: "BREACHED",
        smsStatus: "DELIVERED",
        whatsappStatus: "DELIVERED_TO_ASHA"
      }));
    } else if (newStage === 4) {
      setSim(prev => ({
        ...prev,
        stage: 4,
        slaElapsedHours: 82,
        slaStatus: "COMPLETED",
        smsStatus: "DELIVERED",
        whatsappStatus: "LOOP_CLOSED"
      }));
    }
  };

  const handleResetSim = () => {
    setSim({
      stage: 1,
      autoPlaying: false,
      lastEventId: `evt_${Date.now()}`,
      slaElapsedHours: 12,
      slaStatus: "ON_TRACK",
      patientName: "Sunita Devi (सुनीता देवी)",
      facilityName: "District Hospital, Rewa",
      smsStatus: "DELIVERED",
      whatsappStatus: "READY"
    });
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      zIndex: 100,
      display: "flex",
      justifyContent: "flex-end",
      animation: "fadeIn 0.2s ease-out"
    }}>
      <div style={{
        width: "100%",
        maxWidth: 580,
        height: "100%",
        background: "#0E131F",
        color: "#E2E8F0",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-12px 0 36px rgba(0,0,0,0.6)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }}>
        {/* Header Bar */}
        <div style={{
          padding: "14px 18px",
          background: "#161D2F",
          borderBottom: "1px solid #28334E",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "linear-gradient(135deg, #1E14BE, #6165DE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
                fontWeight: 900,
                fontSize: 12
              }}>
                CCE
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                OpenPHC Care Coordination Engine (CCE)
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
              Standardized referral tracking · SLA evaluation · Multi-channel adaptors
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#202B42",
              border: "none",
              color: "#CBD5E1",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Microservices Health Status Bar */}
        <div style={{
          padding: "8px 18px",
          background: "#111827",
          borderBottom: "1px solid #28334E",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10.5
        }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#94A3B8" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
              Collector: <strong style={{ color: "#E2E8F0" }}>Online</strong>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#94A3B8" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
              Compliance: <strong style={{ color: "#E2E8F0" }}>Online</strong>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#94A3B8" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
              Intelligence: <strong style={{ color: "#E2E8F0" }}>Online</strong>
            </span>
          </div>

          <span style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 6,
            background: "#1E293B",
            color: "#38BDF8",
            fontWeight: 700
          }}>
            FHIR R4 + CloudEvents v1.0
          </span>
        </div>

        {/* 4 Main Navigation Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #28334E",
          background: "#141C2E"
        }}>
          {[
            { id: "SIMULATION" as DrawerTab, label: "Live Simulation", icon: <Play size={13} /> },
            { id: "BENEFITS" as DrawerTab, label: "Why CCE? (Benefits)", icon: <TrendingUp size={13} /> },
            { id: "ADAPTORS" as DrawerTab, label: "SMS & WhatsApp Feed", icon: <MessageSquare size={13} /> },
            { id: "CLOUDEVENTS" as DrawerTab, label: "Outbox Queue", icon: <Layers size={13} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "10px 4px",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #6366F1" : "3px solid transparent",
                background: activeTab === tab.id ? "#1A243B" : "transparent",
                color: activeTab === tab.id ? "#FFFFFF" : "#94A3B8",
                fontSize: 11.5,
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "all 0.15s"
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Live Interactive Simulation Stepper */}
        {activeTab === "SIMULATION" && (
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            {/* Value Statement Banner */}
            <div style={{
              background: "linear-gradient(135deg, rgba(30, 20, 190, 0.25), rgba(97, 101, 222, 0.15))",
              border: "1px solid #37436E",
              borderRadius: 14,
              padding: "14px 16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Sparkles size={16} color="#818CF8" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF" }}>
                  Interactive Care Coordination Pipeline
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#CBD5E1", margin: 0, lineHeight: 1.45 }}>
                Experience how CCE continuously watches high-risk referrals, evaluates 72-hour SLAs, automatically dispatches Hindi DLT SMS and WhatsApp nudges, and verifies arrival at receiving hospitals.
              </p>
            </div>

            {/* Stepper Controls */}
            <div style={{
              background: "#161F33",
              border: "1px solid #28334E",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Scenario Walkthrough
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setSim(prev => ({ ...prev, autoPlaying: !prev.autoPlaying }))}
                    style={{
                      background: sim.autoPlaying ? "#DC2626" : "#4F46E5",
                      color: "#FFF",
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5
                    }}
                  >
                    <Play size={12} />
                    <span>{sim.autoPlaying ? "Pause Auto-play" : "▶ Auto-play All Stages"}</span>
                  </button>

                  <button
                    onClick={handleResetSim}
                    title="Reset simulation"
                    style={{
                      background: "#222E47",
                      color: "#94A3B8",
                      border: "none",
                      borderRadius: 8,
                      padding: "5px 9px",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* 4 Stepper Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Stage 1 */}
                <div 
                  onClick={() => advanceSimStage(1)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: sim.stage === 1 ? "#202C48" : "#131B2C",
                    border: sim.stage === 1 ? "1.5px solid #6366F1" : "1px solid #232C42",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: sim.stage >= 1 ? "#6366F1" : "#28334E",
                        color: "#FFF",
                        fontSize: 10.5,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        1
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sim.stage === 1 ? "#FFF" : "#CBD5E1" }}>
                        Referral Created (org.openphc.task.created)
                      </span>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#1E293B", color: "#38BDF8" }}>
                      Collector
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", paddingLeft: 28, lineHeight: 1.4 }}>
                    Sunita Devi (Severe Anemia, Hb 7.8) referred from Sub-centre Ghurehta to District Hospital Rewa. CCE initializes 72-hour SLA tracking clock.
                  </div>
                </div>

                {/* Stage 2 */}
                <div 
                  onClick={() => advanceSimStage(2)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: sim.stage === 2 ? "#33222B" : "#131B2C",
                    border: sim.stage === 2 ? "1.5px solid #EF4444" : "1px solid #232C42",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: sim.stage >= 2 ? "#EF4444" : "#28334E",
                        color: "#FFF",
                        fontSize: 10.5,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        2
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sim.stage === 2 ? "#FCA5A5" : "#CBD5E1" }}>
                        72h SLA Clock Breach Detected
                      </span>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#38181D", color: "#F87171" }}>
                      Compliance
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", paddingLeft: 28, lineHeight: 1.4 }}>
                    76 hours elapsed with NO arrival recorded at District Hospital. Compliance engine detects breach, increments escalation count to 1, and emits trigger to Intelligence engine.
                  </div>
                </div>

                {/* Stage 3 */}
                <div 
                  onClick={() => advanceSimStage(3)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: sim.stage === 3 ? "#1F2B3E" : "#131B2C",
                    border: sim.stage === 3 ? "1.5px solid #10B981" : "1px solid #232C42",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: sim.stage >= 3 ? "#10B981" : "#28334E",
                        color: "#FFF",
                        fontSize: 10.5,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        3
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sim.stage === 3 ? "#6EE7B7" : "#CBD5E1" }}>
                        Intelligence Router Dispatches Adaptors
                      </span>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#133328", color: "#34D399" }}>
                      Intelligence
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", paddingLeft: 28, lineHeight: 1.4 }}>
                    Automated Hindi DLT SMS sent to Sunita Devi + WhatsApp Nudge Card sent to ASHA Kamla Devi with 1-tap call button + Alert escalated to PHC MO.
                  </div>
                </div>

                {/* Stage 4 */}
                <div 
                  onClick={() => advanceSimStage(4)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: sim.stage === 4 ? "#1E293B" : "#131B2C",
                    border: sim.stage === 4 ? "1.5px solid #38BDF8" : "1px solid #232C42",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: sim.stage >= 4 ? "#38BDF8" : "#28334E",
                        color: "#FFF",
                        fontSize: 10.5,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        4
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sim.stage === 4 ? "#7DD3FC" : "#CBD5E1" }}>
                        Hospital Confirms Arrival & Closes Loop
                      </span>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#16314A", color: "#38BDF8" }}>
                      Closed-Loop
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", paddingLeft: 28, lineHeight: 1.4 }}>
                    District Hospital Rewa confirms patient check-in. CCE halts escalation clock, records attribution <strong>FACILITY_CONFIRMED</strong>, and closes the referral loop.
                  </div>
                </div>
              </div>
            </div>

            {/* Live Clock & Inspection Telemetry */}
            <div style={{
              background: "#12192A",
              border: "1px solid #28334E",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                Live CCE Engine Telemetry
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#192238", padding: "8px 10px", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>SLA Window / Elapsed</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: sim.slaStatus === "BREACHED" ? "#F87171" : "#38BDF8", marginTop: 2 }}>
                    72h / {sim.slaElapsedHours}h elapsed
                  </div>
                </div>

                <div style={{ background: "#192238", padding: "8px 10px", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>Compliance Status</div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: sim.slaStatus === "COMPLETED" ? "#34D399" : sim.slaStatus === "BREACHED" ? "#F87171" : "#FBBF24",
                    marginTop: 2
                  }}>
                    {sim.slaStatus === "COMPLETED" ? "CLOSED (ARRIVED)" : sim.slaStatus === "BREACHED" ? "BREACH DETECTED" : "ON TRACK"}
                  </div>
                </div>
              </div>

              {sim.stage >= 3 && (
                <div style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#162D24",
                  border: "1px solid #1C4837",
                  fontSize: 11.5,
                  lineHeight: 1.45,
                  color: "#6EE7B7"
                }}>
                  ✅ <strong>Receiver Adaptor Fired:</strong> DLT SMS template <code>DLT-MP-HRP-REF-101</code> sent to patient. WhatsApp nudge dispatched to ASHA Kamla Devi (+91 98270 11223).
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Why CCE? (Usage Benefits & Value Comparison) */}
        {activeTab === "BENEFITS" && (
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div style={{
              background: "linear-gradient(135deg, #1E14BE22, #18867322)",
              border: "1px solid #2F3B66",
              borderRadius: 14,
              padding: 14
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#FFF", marginBottom: 4 }}>
                Transforming Fragmented Care into a Continuous Continuum
              </div>
              <p style={{ fontSize: 12, color: "#CBD5E1", margin: 0, lineHeight: 1.45 }}>
                Without CCE, 48% of high-risk pregnancies drop out between peripheral health posts and secondary hospitals. CCE provides real-time visibility, automated SLA clocks, and intelligent closed-loop follow-up.
              </p>
            </div>

            {/* 4 Quantitative Impact Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {/* Card 1 */}
              <div style={{
                background: "#161F33",
                border: "1px solid #28334E",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>Referral Dropout Rate</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#34D399" }}>13.8%</span>
                  <span style={{ fontSize: 12, color: "#F87171", textDecoration: "line-through" }}>48.2%</span>
                </div>
                <div style={{ fontSize: 11, color: "#A7F3D0", fontWeight: 700 }}>
                  ↓ 71.4% reduction in dropouts
                </div>
              </div>

              {/* Card 2 */}
              <div style={{
                background: "#161F33",
                border: "1px solid #28334E",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>Time to Detect Dropout</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#38BDF8" }}>&lt; 1 hr</span>
                  <span style={{ fontSize: 12, color: "#F87171", textDecoration: "line-through" }}>45 days</span>
                </div>
                <div style={{ fontSize: 11, color: "#BAE6FD", fontWeight: 700 }}>
                  ⚡ 45x faster intervention
                </div>
              </div>

              {/* Card 3 */}
              <div style={{
                background: "#161F33",
                border: "1px solid #28334E",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>Closed-Loop Verification</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#34D399" }}>86.4%</span>
                  <span style={{ fontSize: 12, color: "#F87171", textDecoration: "line-through" }}>41.8%</span>
                </div>
                <div style={{ fontSize: 11, color: "#A7F3D0", fontWeight: 700 }}>
                  ↑ 2.1x verified loop closures
                </div>
              </div>

              {/* Card 4 */}
              <div style={{
                background: "#161F33",
                border: "1px solid #28334E",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>Frontline Paper Burden</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#FBBF24" }}>-65%</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>4 registers</span>
                </div>
                <div style={{ fontSize: 11, color: "#FDE68A", fontWeight: 700 }}>
                  30-second prioritized mobile worklist
                </div>
              </div>
            </div>

            {/* Role Specific Benefits */}
            <div style={{
              background: "#161F33",
              border: "1px solid #28334E",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                Tangible Benefits by Frontline Persona
              </div>

              {/* Persona Selector Tabs */}
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "ASHA" as const, label: "For ASHA Workers" },
                  { id: "MO" as const, label: "For PHC Medical Officer" },
                  { id: "DPO" as const, label: "For District Collector / DPO" },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedRoleBenefit(b.id)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "none",
                      background: selectedRoleBenefit === b.id ? "#4F46E5" : "#1E293B",
                      color: selectedRoleBenefit === b.id ? "#FFF" : "#94A3B8",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Persona Content */}
              <div style={{
                background: "#0E131F",
                border: "1px solid #232D47",
                borderRadius: 12,
                padding: 12,
                fontSize: 12,
                lineHeight: 1.5,
                color: "#CBD5E1"
              }}>
                {selectedRoleBenefit === "ASHA" && (
                  <div>
                    <div style={{ fontWeight: 800, color: "#34D399", marginBottom: 4 }}>
                      No more wasted home visits to women who already reached the hospital!
                    </div>
                    <div>
                      • ASHA only receives WhatsApp alerts when a referral actually breaches the 72h window without an arrival.<br />
                      • Free DLT SMS are delivered directly to the patient's family phone from the government gateway, saving ASHA recharge balances.<br />
                      • One-tap phone dialler to connect with the pregnant woman or secondary hospital nurse.
                    </div>
                  </div>
                )}

                {selectedRoleBenefit === "MO" && (
                  <div>
                    <div style={{ fontWeight: 800, color: "#38BDF8", marginBottom: 4 }}>
                      Continuous catchment intelligence without waiting for monthly paper reports.
                    </div>
                    <div>
                      • Sub-centre ladder rankings comparing SC Ghurehta, SC Bhanpur, SC Dihiya, and SC Katra.<br />
                      • Real-time visibility into high-risk referrals that dropped out or got closed at a lower-level facility than recommended.<br />
                      • Plain English/Hindi AI queries to identify transportation or counseling bottlenecks across villages.
                    </div>
                  </div>
                )}

                {selectedRoleBenefit === "DPO" && (
                  <div>
                    <div style={{ fontWeight: 800, color: "#FBBF24", marginBottom: 4 }}>
                      Closed-loop district-wide maternal and cancer care tracking.
                    </div>
                    <div>
                      • Elimination of cross-facility blind spots between PHCs, CHCs, and District Hospital Rewa.<br />
                      • Auditable CloudEvents event log ensuring every high-risk pregnancy has an assigned accountability chain.<br />
                      • Seamless compliance with National Health Mission (NHM) and PMSMA guidelines.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SMS & WhatsApp Receiver Adaptors Feed */}
        {activeTab === "ADAPTORS" && (
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              Live demonstration of the multi-channel adaptors triggered by the CCE Intelligence Router:
            </div>

            {/* Adaptor 1: Hindi DLT SMS */}
            <div style={{
              background: "#161F33",
              border: "1px solid #28334E",
              borderRadius: 16,
              overflow: "hidden"
            }}>
              <div style={{
                padding: "8px 14px",
                background: "#1C2740",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Send size={12} color="#38BDF8" />
                  <span style={{ fontWeight: 800, color: "#FFF" }}>Telecom DLT-Approved Hindi SMS</span>
                </div>
                <span style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#143729",
                  color: "#34D399",
                  fontSize: 10,
                  fontWeight: 800
                }}>
                  DELIVERED · DLT-MP-HRP-REF-101
                </span>
              </div>

              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 8 }}>
                  Sender: <strong>HP-GOVMP</strong> · Receiver: <strong>+91 98261 23451</strong> (Sunita Devi)
                </div>

                {/* Chat Bubble */}
                <div style={{
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: "14px 14px 14px 2px",
                  padding: "12px 14px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#F1F5F9"
                }}>
                  सुनीता जी, आपकी ज़िला अस्पताल रीवा की जाँच 14 सितंबर को देय है। कृपया समय पर पहुँचें। सहायता हेतु आशा कमला देवी से संपर्क करें (9827011223)। - स्वास्थ्य विभाग म.प्र.
                </div>

                <div style={{ fontSize: 10, color: "#64748B", marginTop: 6, textAlign: "right" }}>
                  Delivery timestamp: 14 Sep, 10:30 AM · Delivery receipt: 100% OK
                </div>
              </div>
            </div>

            {/* Adaptor 2: WhatsApp Business API ASHA Nudge Card */}
            <div style={{
              background: "#161F33",
              border: "1px solid #28334E",
              borderRadius: 16,
              overflow: "hidden"
            }}>
              <div style={{
                padding: "8px 14px",
                background: "#075E54",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MessageSquare size={12} color="#FFF" />
                  <span style={{ fontWeight: 800, color: "#FFF" }}>WhatsApp Business API · ASHA Nudge Card</span>
                </div>
                <span style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#128C7E",
                  color: "#FFF",
                  fontSize: 10,
                  fontWeight: 800
                }}>
                  VERIFIED BUSINESS
                </span>
              </div>

              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 8 }}>
                  Recipient: <strong>Kamla Devi (ASHA, Ghurehta)</strong> · +91 98270 11223
                </div>

                {/* WhatsApp Message Card */}
                <div style={{
                  background: "#1F2D3D",
                  border: "1px solid #2B4257",
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#E2E8F0" }}>
                    ⚠️ <strong>CCE इंटेलिजेंस अलर्ट:</strong> सुनीता देवी (ग्राम घुराहटा) को <strong>ज़िला अस्पताल रीवा</strong> रेफर किया गया था, लेकिन 72 घंटे में अस्पताल आगमन दर्ज नहीं हुआ है।<br /><br />
                    कृपया तुरंत गृह भेंट कर कारण जानें व आवश्यक सहायता प्रदान करें।
                  </div>

                  {/* Interactive Action Buttons inside WhatsApp */}
                  <div style={{ display: "flex", gap: 8, borderTop: "1px solid #2B4257", paddingTop: 10 }}>
                    <a
                      href="tel:+919826123451"
                      style={{
                        flex: 1,
                        background: "#25D366",
                        color: "#0B2E1B",
                        borderRadius: 8,
                        padding: "7px 0",
                        fontSize: 11,
                        fontWeight: 800,
                        textAlign: "center",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4
                      }}
                    >
                      <Phone size={12} />
                      <span>Call Patient</span>
                    </a>

                    <a
                      href="tel:+919827011223"
                      style={{
                        flex: 1,
                        background: "#334155",
                        color: "#E2E8F0",
                        borderRadius: 8,
                        padding: "7px 0",
                        fontSize: 11,
                        fontWeight: 800,
                        textAlign: "center",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4
                      }}
                    >
                      <Phone size={12} />
                      <span>Call ASHA</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Adaptor 3: MO Insights Supervisory Alert */}
            <div style={{
              background: "#161F33",
              border: "1px solid #28334E",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BellRing size={14} color="#F87171" />
                <span style={{ fontSize: 12, fontWeight: 800, color: "#F87171" }}>
                  PHC Medical Officer Supervisory Escalation
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.45 }}>
                "High-Risk Pregnancy referral breach (&gt;72h) escalated for Sub-centre Ghurehta. Patient: Sunita Devi (Severe Anemia, Hb 7.8). Facility: District Hospital Rewa."
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: CloudEvents v1.0 & FHIR R4 Task Explorer */}
        {activeTab === "CLOUDEVENTS" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Outbox Sync Bar */}
            <div style={{
              padding: "10px 18px",
              background: "#161F33",
              borderBottom: "1px solid #28334E",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>Collector:</span>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => {
                    setEndpoint(e.target.value);
                    outboxManager.setEndpoint(e.target.value);
                  }}
                  placeholder="https://..."
                  style={{
                    flex: 1,
                    background: "#0E131F",
                    border: "1px solid #37436E",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "#E2E8F0",
                    fontSize: 10.5,
                    fontFamily: "ui-monospace, monospace"
                  }}
                />
              </div>

              {/* Quick Preset Endpoint Buttons */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                {[
                  { label: "🏥 nextsteps.mdtlabs.org", url: "https://nextsteps.mdtlabs.org/v1/events" },
                  { label: "🌐 Live Public Tunnel", url: "https://honest-otters-arrive.loca.lt/v1/events" },
                  { label: "☁️ Render Cloud", url: "https://next-steps-cce.onrender.com/v1/events" },
                  { label: "💻 Localhost:8080", url: "http://localhost:8080/v1/events" },
                ].map((preset) => (
                  <button
                    key={preset.url}
                    onClick={() => {
                      setEndpoint(preset.url);
                      outboxManager.setEndpoint(preset.url);
                    }}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: endpoint === preset.url ? "1px solid #38BDF8" : "1px solid #28334E",
                      background: endpoint === preset.url ? "#16314A" : "#1A243B",
                      color: endpoint === preset.url ? "#38BDF8" : "#94A3B8",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, color: "#CBD5E1" }}>
                  Total: <strong>{outbox.length}</strong> | 
                  Queued: <span style={{ color: "#FBBF24" }}>{outbox.filter(e => e.status === "QUEUED").length}</span> | 
                  Sent: <span style={{ color: "#34D399" }}>{outbox.filter(e => e.status === "SENT").length}</span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    style={{
                      background: "#4F46E5",
                      color: "#FFF",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                    <span>{syncing ? "Syncing..." : "Sync to Local Server"}</span>
                  </button>

                  <button
                    onClick={() => outboxManager.clearSentEvents()}
                    style={{
                      background: "#28334E",
                      color: "#CBD5E1",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 11,
                      cursor: "pointer"
                    }}
                  >
                    Clear Sent
                  </button>
                </div>
              </div>
            </div>

            {/* Format Selector */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid #28334E",
              background: "#111827"
            }}>
              <button
                onClick={() => setSubTabFormat("cloudevent")}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  border: "none",
                  borderBottom: subTabFormat === "cloudevent" ? "2px solid #818CF8" : "2px solid transparent",
                  background: "transparent",
                  color: subTabFormat === "cloudevent" ? "#FFF" : "#94A3B8",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                CloudEvents v1.0 Envelope
              </button>
              <button
                onClick={() => setSubTabFormat("fhir")}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  border: "none",
                  borderBottom: subTabFormat === "fhir" ? "2px solid #818CF8" : "2px solid transparent",
                  background: "transparent",
                  color: subTabFormat === "fhir" ? "#FFF" : "#94A3B8",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                FHIR R4 Task Resource
              </button>
            </div>

            {/* Event List */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              {outbox.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B", fontSize: 13 }}>
                  No events generated yet. Record a next step or confirm an arrival to emit OpenPHC CloudEvents.
                </div>
              ) : (
                outbox.map((evt) => {
                  const displayPayload = subTabFormat === "cloudevent" ? evt.payload : evt.payload.data;
                  const jsonString = JSON.stringify(displayPayload, null, 2);

                  return (
                    <div
                      key={evt.id}
                      style={{
                        background: "#161F33",
                        border: "1px solid #28334E",
                        borderRadius: 10,
                        overflow: "hidden"
                      }}
                    >
                      <div style={{
                        padding: "8px 12px",
                        background: "#202B42",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {evt.status === "SENT" ? (
                            <CheckCircle2 size={13} color="#34D399" />
                          ) : evt.status === "QUEUED" ? (
                            <RefreshCw size={13} color="#FBBF24" />
                          ) : (
                            <AlertCircle size={13} color="#F87171" />
                          )}
                          <span style={{ fontWeight: 700, color: "#FFF" }}>{evt.eventType}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: evt.status === "SENT" ? "#143729" : evt.status === "QUEUED" ? "#382914" : "#38181D",
                            color: evt.status === "SENT" ? "#34D399" : evt.status === "QUEUED" ? "#FBBF24" : "#F87171"
                          }}>
                            {evt.status}
                          </span>
                          <button
                            onClick={() => handleCopy(evt.id, jsonString)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#94A3B8",
                              cursor: "pointer"
                            }}
                            title="Copy JSON"
                          >
                            {copiedId === evt.id ? <Check size={13} color="#34D399" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>
                          Subject: <strong>{evt.payload.subject}</strong> · Facility: <strong>{evt.payload.facilityid}</strong>
                        </div>
                        <pre style={{
                          margin: 0,
                          maxHeight: 200,
                          overflow: "auto",
                          background: "#0E131F",
                          padding: 10,
                          borderRadius: 6,
                          fontSize: 11,
                          lineHeight: 1.4,
                          color: "#94A3B8",
                          fontFamily: "ui-monospace, monospace"
                        }}>
                          <code>{jsonString}</code>
                        </pre>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
