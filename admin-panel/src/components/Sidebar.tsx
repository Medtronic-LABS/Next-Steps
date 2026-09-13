import React from 'react';

export type NavTab = 'cce' | 'users' | 'catchment' | 'config' | 'insights' | 'audit';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  outboxPendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, outboxPendingCount = 0 }) => {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <div className="brand-badge">NS</div>
        <div>
          <div className="brand-title">Next Steps</div>
          <div className="brand-subtitle">Admin & CCE Cockpit</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Integration & Health</div>
        <button
          id="nav-cce-telemetry"
          className={`nav-item ${activeTab === 'cce' ? 'active' : ''}`}
          onClick={() => onSelectTab('cce')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          CCE Event Telemetry
          {outboxPendingCount > 0 && <span className="badge-count">{outboxPendingCount}</span>}
        </button>

        <div className="nav-section-title">Governance & Administration</div>
        <button
          id="nav-user-management"
          className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => onSelectTab('users')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          User & Roles
        </button>

        <button
          id="nav-catchment-hierarchy"
          className={`nav-item ${activeTab === 'catchment' ? 'active' : ''}`}
          onClick={() => onSelectTab('catchment')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Facilities & Catchment
        </button>

        <button
          id="nav-deployment-config"
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => onSelectTab('config')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          SLA & Escalation Rules
        </button>

        <div className="nav-section-title">Supervisory & Audit</div>
        <button
          id="nav-insights-overview"
          className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => onSelectTab('insights')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Supervisory Insights
        </button>

        <button
          id="nav-audit-logs"
          className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => onSelectTab('audit')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Audit Logs
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="pilot-tag">
          <span className="pilot-tag-title">Rewa Pilot Block</span>
          <span className="pilot-tag-desc">Madhya Pradesh · CCE Dev</span>
        </div>
      </div>
    </aside>
  );
};
