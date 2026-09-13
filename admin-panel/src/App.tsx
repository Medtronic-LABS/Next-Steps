import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { CceTelemetryView } from './views/CceTelemetryView';
import { UserManagementView } from './views/UserManagementView';
import { CatchmentView } from './views/CatchmentView';
import { DeploymentConfigView } from './views/DeploymentConfigView';
import { InsightsOverviewView } from './views/InsightsOverviewView';
import { AuditLogsView } from './views/AuditLogsView';
import './styles/admin.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('cce');
  const [cceStatus, setCceStatus] = useState({
    gateway: { status: 'UP', latencyMs: 85 },
    keycloak: { status: 'UP', latencyMs: 140 },
  });
  const [outboxStats, setOutboxStats] = useState({ pending: 0, total: 0 });

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      if (data.success && data.cce) {
        setCceStatus(data.cce);
        if (data.outbox) {
          setOutboxStats({ pending: data.outbox.pending, total: data.outbox.total });
        }
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'cce':
        return 'CCE Event Telemetry & Direct Ingestion Cockpit';
      case 'users':
        return 'Staff Personas & User Management';
      case 'catchment':
        return 'Health Facility Ladder & Catchment Mapping';
      case 'config':
        return 'SLA Escalation Rules & Deployment Parameters';
      case 'insights':
        return 'District & Block Supervisory Insights';
      case 'audit':
        return 'Access & Security Audit Logs';
      default:
        return 'Next-Steps Administration';
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        outboxPendingCount={outboxStats.pending}
      />

      <div className="admin-main">
        <Header
          title={getTabTitle()}
          cceStatus={cceStatus}
          onRefresh={fetchStatus}
        />

        {activeTab === 'cce' && <CceTelemetryView />}
        {activeTab === 'users' && <UserManagementView />}
        {activeTab === 'catchment' && <CatchmentView />}
        {activeTab === 'config' && <DeploymentConfigView />}
        {activeTab === 'insights' && <InsightsOverviewView />}
        {activeTab === 'audit' && <AuditLogsView />}
      </div>
    </div>
  );
};
