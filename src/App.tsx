import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CoordinationProvider, useCoordination } from "./context/CoordinationContext";
import { AppHeader } from "./components/layout/AppHeader";
import { BottomNav, NavTab } from "./components/layout/BottomNav";
import { LauncherView } from "./views/LauncherView";
import { LookupView } from "./views/LookupView";
import { RegisterView } from "./views/RegisterView";
import { CaptureView } from "./views/CaptureView";
import { HomeView } from "./views/HomeView";
import { WorklistView } from "./views/WorklistView";
import { JourneyView } from "./views/JourneyView";
import { AlertsView } from "./views/AlertsView";
import { InsightsView } from "./views/InsightsView";
import { BottomSheetContainer } from "./components/modals/BottomSheetContainer";
import { OpenPHCInspectorDrawer } from "./components/dev/OpenPHCInspectorDrawer";
import { ActiveDialog, ServiceDomain, TrackingOutcomeType } from "./openphc/types";
import "./styles/global.css";

type ActiveSubView = "nav" | "register" | "capture" | "journey";

const MainApp: React.FC = () => {
  const { isLoggedIn, role, setService } = useAuth();
  const { 
    setActivePatient, 
    patients, 
    createNextSteps, 
    confirmArrival, 
    recordTrackingOutcome, 
    rescheduleStep 
  } = useCoordination();

  const [inLauncher, setInLauncher] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const [subView, setSubView] = useState<ActiveSubView>("nav");
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const handleSelectPatient = (patientId: string) => {
    const p = patients.find((pat) => pat.id === patientId) || null;
    setActivePatient(p);
    setSubView("journey");
  };

  const handleGoToRegister = () => {
    setSubView("register");
  };

  const handleGoToCapture = () => {
    setSubView("capture");
  };

  const handleRegistered = (patientId: string) => {
    const p = patients.find((pat) => pat.id === patientId) || null;
    setActivePatient(p);
    setSubView("capture");
  };

  // Helper date utility
  const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  // Dialog Handlers
  const handleConfirmReferral = async (targetFacilityId: string, targetFacilityName: string) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(activeDialog.woman.id, [
      {
        category: "REFERRAL",
        targetFacilityId,
        dueDate: addDays(7),
        priority: "ROUTINE",
        detailText: `Referral to ${targetFacilityName}`,
      },
    ]);
    setActiveDialog(null);
  };

  const handleConfirmAncVisit = async (date: string, summary: string) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(activeDialog.woman.id, [
      {
        category: "ANC_VISIT",
        targetFacilityId: "SUBCENTRE",
        dueDate: date,
        priority: "ROUTINE",
        detailText: summary,
      },
    ]);
    setActiveDialog(null);
  };

  const handleConfirmPmsmaVisit = async (sessionDate: string) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(activeDialog.woman.id, [
      {
        category: "PMSMA_VISIT",
        targetFacilityId: "PHC",
        dueDate: sessionDate,
        priority: "ROUTINE",
        detailText: "PMSMA Specialist Session (9th)",
      },
    ]);
    setActiveDialog(null);
  };

  const handleConfirmUsg = async (date: string) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(activeDialog.woman.id, [
      {
        category: "IMAGING",
        targetFacilityId: "CHC",
        dueDate: date,
        priority: "ROUTINE",
        detailText: "Obstetric USG Scan",
      },
    ]);
    setActiveDialog(null);
  };

  const handleConfirmAshaRef = async (who: string, targetFacilityId: string) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(activeDialog.woman.id, [
      {
        category: "HOME_VISIT",
        dueDate: addDays(3),
        priority: "ROUTINE",
        detailText: `PNC Escort for ${who} to ${targetFacilityId}`,
      },
    ]);
    setActiveDialog(null);
  };

  const handleConfirmHbnc = async (selectedDates: string[]) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(
      activeDialog.woman.id,
      selectedDates.map((d, i) => ({
        category: "HBNC" as any,
        dueDate: d,
        priority: "ROUTINE" as const,
        detailText: `HBNC Home Visit #${i + 1}`,
      }))
    );
    setActiveDialog(null);
  };

  const handleCompleteStep = async (stepId: string, outcome: TrackingOutcomeType) => {
    await recordTrackingOutcome(stepId, outcome);
    setActiveDialog(null);
  };

  const handleRescheduleStep = async (stepId: string, newDate: string) => {
    await rescheduleStep(stepId, newDate);
    setActiveDialog(null);
  };

  const handleSendSms = async (stepId: string, text: string) => {
    console.log("Sending simulated DLT SMS:", stepId, text);
    setActiveDialog(null);
  };

  const handleScanResult = (simulatedPatientId: string) => {
    const p = patients.find((pat) => pat.id === simulatedPatientId) || patients[0];
    if (p) {
      setActivePatient(p);
      setSubView("journey");
    }
    setActiveDialog(null);
  };

  const handleConfirmLabTest = async (testName: string, date: string) => {
    if (!activeDialog || !("woman" in activeDialog) || !activeDialog.woman) return;
    await createNextSteps(activeDialog.woman.id, [
      {
        category: "LAB",
        dueDate: date,
        priority: "ROUTINE",
        detailText: testName,
      },
    ]);
    setActiveDialog(null);
  };

  // If launcher is open
  if (inLauncher || !isLoggedIn) {
    return (
      <div className="app-device-wrapper">
        <div className="mobile-device-shell">
          <div className="mobile-screen-content">
            <LauncherView onEnterApp={() => setInLauncher(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-device-wrapper">
      <div className="mobile-device-shell">
        <div className="mobile-screen-content">
          {/* Header */}
          <AppHeader
            onOpenDevDrawer={() => setIsDevDrawerOpen(true)}
            onOpenLauncher={() => setInLauncher(true)}
          />

          {/* Body Content */}
          <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {subView === "register" && (
              <RegisterView
                onBack={() => setSubView("nav")}
                onRegistered={handleRegistered}
              />
            )}

            {subView === "capture" && (
              <CaptureView
                onBack={() => setSubView("journey")}
                onSaved={() => setSubView("journey")}
              />
            )}

            {subView === "journey" && (
              <JourneyView
                onBack={() => setSubView("nav")}
                onGoToCapture={handleGoToCapture}
                onOpenDialog={(dlg) => setActiveDialog(dlg)}
              />
            )}

            {subView === "nav" && (
              <>
                {currentTab === "home" && (
                  <HomeView
                    onSelectService={(s: ServiceDomain) => setService(s)}
                    onGoToWorklist={() => setCurrentTab("worklist")}
                    onGoToLookup={() => setCurrentTab("lookup")}
                    onGoToRegister={handleGoToRegister}
                    onGoToInsights={() => setCurrentTab("insights")}
                    onScanQR={() => setActiveDialog({ type: "scan_qr" })}
                  />
                )}

                {currentTab === "worklist" && (
                  <WorklistView 
                    onSelectPatient={handleSelectPatient}
                    onOpenDialog={(dlg) => setActiveDialog(dlg)}
                  />
                )}

                {currentTab === "lookup" && (
                  <LookupView
                    onSelectPatient={handleSelectPatient}
                    onGoToRegister={handleGoToRegister}
                    onScanQR={() => setActiveDialog({ type: "scan_qr" })}
                  />
                )}

                {currentTab === "alerts" && (
                  <AlertsView 
                    onSelectPatient={handleSelectPatient}
                    onOpenDialog={(dlg) => setActiveDialog(dlg)}
                  />
                )}

                {currentTab === "insights" && (
                  <InsightsView />
                )}
              </>
            )}
          </main>

          {/* Bottom Nav */}
          {subView === "nav" && (
            <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
          )}

          {/* Universal Bottom Sheet Container (matching all 11 prototype dialogs) */}
          <BottomSheetContainer
            dialog={activeDialog}
            onClose={() => setActiveDialog(null)}
            onConfirmReferral={handleConfirmReferral}
            onConfirmAncVisit={handleConfirmAncVisit}
            onConfirmPmsmaVisit={handleConfirmPmsmaVisit}
            onConfirmUsg={handleConfirmUsg}
            onConfirmAshaRef={handleConfirmAshaRef}
            onConfirmHbnc={handleConfirmHbnc}
            onCompleteStep={handleCompleteStep}
            onRescheduleStep={handleRescheduleStep}
            onSendSms={handleSendSms}
            onScanResult={handleScanResult}
            onOpenDialog={(dlg) => setActiveDialog(dlg)}
            onConfirmLabTest={handleConfirmLabTest}
          />

          {/* OpenPHC Event Inspector Drawer */}
          <OpenPHCInspectorDrawer
            isOpen={isDevDrawerOpen}
            onClose={() => setIsDevDrawerOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CoordinationProvider>
        <MainApp />
      </CoordinationProvider>
    </AuthProvider>
  );
};
export default App;
