import React from 'react';

interface HeaderProps {
  title: string;
  cceStatus: {
    gateway: { status: string; latencyMs?: number };
    keycloak: { status: string; latencyMs?: number };
  };
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, cceStatus, onRefresh }) => {
  const isGatewayUp = cceStatus.gateway.status === 'UP';

  return (
    <header className="admin-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        {onRefresh && (
          <button id="btn-refresh-status" className="btn btn-secondary btn-sm" onClick={onRefresh} title="Refresh System Status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        )}

        <div className={`cce-status-chip ${isGatewayUp ? '' : 'down'}`} title="Live telemetry to api.cce.mdtlabs.org">
          <span className="cce-pulse-dot"></span>
          <span>CCE Gateway: {isGatewayUp ? `Online (${cceStatus.gateway.latencyMs}ms)` : 'Offline'}</span>
        </div>

        <div className="user-profile-badge">
          <div className="avatar-circle">DP</div>
          <div className="user-details">
            <span className="user-name">Dr. Verma</span>
            <span className="user-role-label">DPO · Rewa District</span>
          </div>
        </div>
      </div>
    </header>
  );
};
