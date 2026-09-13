import React from 'react';

export const InsightsOverviewView: React.FC = () => {
  return (
    <div className="page-container">
      {/* Top Metrics */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-anc)' } as React.CSSProperties}>
          <span className="stat-label">Active HRP Women (ANC)</span>
          <span className="stat-value">74</span>
          <span className="stat-sub">Rewa District Pilot Cohort</span>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--status-success)' } as React.CSSProperties}>
          <span className="stat-label">Closed-Loop Tracking Rate</span>
          <span className="stat-value" style={{ color: 'var(--status-success)' }}>86.4%</span>
          <span className="stat-sub">Care completed at recommended level</span>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--status-warning)' } as React.CSSProperties}>
          <span className="stat-label">Closed Below Recommended Tier</span>
          <span className="stat-value" style={{ color: 'var(--status-warning)' }}>19.0%</span>
          <span className="stat-sub">14 / 74 referrals closed at lower facility</span>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-pnc)' } as React.CSSProperties}>
          <span className="stat-label">Avg. Days to Care Completion</span>
          <span className="stat-value">3.2 d</span>
          <span className="stat-sub">vs 48.6 d historical paper baseline</span>
        </div>
      </div>

      {/* Care Cascade */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Care Cascade & Closed-Loop Follow-through (Rewa District)
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <span>1. Identified & Registered as High-Risk (HRP)</span>
              <span>74 Women (100%)</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <span>2. Next Step Prescribed (Referral / USG / Specialist Follow-up)</span>
              <span>72 Women (97.3%)</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: '97.3%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <span>3. Reached Target Hospital (DH Rewa / CHC Teonthar)</span>
              <span>64 Women (86.4%)</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: '86.4%', height: '100%', backgroundColor: 'var(--status-success)' }}></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <span>4. Closed Loop Provenance Verified (Care Delivered & Feedback Recorded)</span>
              <span>64 Women (86.4%)</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: '86.4%', height: '100%', backgroundColor: 'var(--status-success)' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Destination Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Referral Destination Breakdown</div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>District Hospital, Rewa</span>
              <strong>54% (40 women)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>CHC Teonthar</span>
              <strong>26% (19 women)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Medical College, Jabalpur (Tertiary)</span>
              <strong>12% (9 women)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Private Hospital (Empanelled)</span>
              <strong>8% (6 women)</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ color: 'var(--status-warning)' }}>
              ⚠️ Lower-Tier Closure Alerts (14 Referrals)
            </div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--status-warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <strong>DH Rewa $\rightarrow$ Closed at Sub-centre:</strong> 8 women were referred to District Hospital for severe anaemia, but care was closed at Sub-centre without specialist review.
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--status-warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <strong>CHC Teonthar $\rightarrow$ Closed at Sub-centre:</strong> 6 women closed at Sub-centre Ghurehta in place of recommended CHC.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
