import React from "react";
import { ClipboardList, Search, Bell, BarChart3, Home } from "lucide-react";
import { useCoordination } from "../../context/CoordinationContext";

export type NavTab = "home" | "worklist" | "lookup" | "alerts" | "insights";

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { alerts } = useCoordination();
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: "home", label: "Home", icon: <Home size={20} /> },
    { id: "worklist", label: "Worklist", icon: <ClipboardList size={20} /> },
    { id: "lookup", label: "Find / Add", icon: <Search size={20} /> },
    { id: "alerts", label: "Alerts", icon: <Bell size={20} />, badge: unreadAlerts },
    { id: "insights", label: "Insights", icon: <BarChart3 size={20} /> },
  ];

  return (
    <nav style={{
      height: 64,
      background: "#FFFFFF",
      borderTop: "1px solid #ECEAE4",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      padding: "0 10px",
      zIndex: 30,
      flexShrink: 0
    }}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              background: "transparent",
              color: isActive ? "var(--ml-blue)" : "var(--ml-ink-500)",
              cursor: "pointer",
              position: "relative",
              padding: "6px 0",
              transition: "color 0.15s"
            }}
          >
            <div style={{ position: "relative" }}>
              {tab.icon}
              {Boolean(tab.badge && tab.badge > 0) && (
                <span style={{
                  position: "absolute",
                  top: -4,
                  right: -8,
                  background: "#C35721",
                  color: "#FFF",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 10,
                  lineHeight: 1.2
                }}>
                  {tab.badge}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
