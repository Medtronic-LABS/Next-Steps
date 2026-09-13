import React, { useState, useEffect } from 'react';

interface OutboxStats {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
}

interface OutboxEvent {
  id: string;
  event_id: string;
  cloud_events_id: string;
  cce_ack_event_id: string | null;
  event_type: string;
  subject: string;
  facility_id: string | null;
  correlation_id: string;
  payload: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  attempts: number;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
}

export const CceTelemetryView: React.FC = () => {
  const [stats, setStats] = useState<OutboxStats>({ total: 0, pending: 0, delivered: 0, failed: 0 });
  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DELIVERED' | 'PENDING' | 'FAILED'>('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OutboxEvent | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statusRes = await fetch('/api/admin/status');
      const statusData = await statusRes.json();
      if (statusData.success && statusData.outbox) {
        setStats(statusData.outbox);
      }

      const outboxRes = await fetch(`/api/admin/outbox?status=${filter}&limit=50`);
      const outboxData = await outboxRes.json();
      if (outboxData.success) {
        setEvents(outboxData.events);
      }
    } catch (err) {
      console.error('Error fetching CCE outbox data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleSendTestEvent = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/outbox/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'Patient/Sunita-Devi-w1',
          category: 'REFERRAL',
          level: 'CHC',
        }),
      });
      const data = await res.json();
      setTestResult(data);
      fetchData();
    } catch (err) {
      console.error('Failed to send test event:', err);
    } finally {
      setTestSending(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await fetch('/api/admin/outbox/retry', { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to retry outbox:', err);
    }
  };

  return (
    <div className="page-container">
      {/* Top Stat KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-cce)' } as React.CSSProperties}>
          <span className="stat-label">Total CloudEvents Emitted</span>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-sub">Ingested into CCE Platform</span>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--status-success)' } as React.CSSProperties}>
          <span className="stat-label">Delivered (202 Accepted)</span>
          <span className="stat-value" style={{ color: 'var(--status-success)' }}>{stats.delivered}</span>
          <span className="stat-sub">Acked by api.cce.mdtlabs.org</span>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--status-warning)' } as React.CSSProperties}>
          <span className="stat-label">In-Flight / Outbox Pending</span>
          <span className="stat-value" style={{ color: 'var(--status-warning)' }}>{stats.pending}</span>
          <span className="stat-sub">Awaiting background dispatch</span>
        </div>

        <div className="stat-card" style={{ '--stat-accent': 'var(--status-danger)' } as React.CSSProperties}>
          <span className="stat-label">Dead-Letter Queue (Failed)</span>
          <span className="stat-value" style={{ color: 'var(--status-danger)' }}>{stats.failed}</span>
          <span className="stat-sub">Require retry</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            Direct Event Emission Cockpit (Tiberbu Pattern)
          </div>

          <div className="panel-actions">
            {stats.failed > 0 && (
              <button id="btn-retry-failed" className="btn btn-danger btn-sm" onClick={handleRetryFailed}>
                Retry {stats.failed} Failed Events
              </button>
            )}

            <button
              id="btn-send-test-cce-event"
              className="btn btn-primary btn-sm"
              onClick={handleSendTestEvent}
              disabled={testSending}
            >
              {testSending ? 'Transmitting...' : '🚀 Emit Test CloudEvent to CCE'}
            </button>
          </div>
        </div>

        {/* Test Result Toast Card */}
        {testResult && (
          <div style={{ padding: '16px 24px', backgroundColor: testResult.success ? 'var(--status-success-bg)' : 'var(--status-danger-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: testResult.success ? 'var(--status-success)' : 'var(--status-danger)', marginBottom: '6px' }}>
              {testResult.success ? '✅ Live CCE Gateway Accepted CloudEvent (HTTP 202 Accepted)' : '❌ CCE Gateway Rejected Event'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Ack Event ID: <code style={{ color: '#fff' }}>{testResult.result?.data?.eventId || 'None'}</code> · Correlation ID: <code>{testResult.result?.data?.correlationId}</code> · Received At: {testResult.result?.data?.receivedAt}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Filter by status:</span>
          {(['ALL', 'DELIVERED', 'PENDING', 'FAILED'] as const).map((s) => (
            <button
              key={s}
              id={`filter-${s.toLowerCase()}`}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {events.length} events (Auto-refreshes every 4s)
          </span>
        </div>

        {/* Events Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>CloudEvents ID</th>
                <th>Event Type</th>
                <th>Subject (Patient UPID)</th>
                <th>Facility</th>
                <th>CCE Ack ID</th>
                <th>Emitted Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No outbox events matching filter "{filter}". Stage a step in the Mobile App or click "Emit Test CloudEvent to CCE".
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id}>
                    <td>
                      <span className={`badge ${evt.status === 'DELIVERED' ? 'badge-success' : evt.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                        {evt.status === 'DELIVERED' ? '✓ Accepted' : evt.status}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{evt.event_id}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{evt.event_type}</span>
                    </td>
                    <td>
                      <strong>{evt.subject}</strong>
                    </td>
                    <td>{evt.facility_id || 'PHC-SIRMOUR'}</td>
                    <td>
                      {evt.cce_ack_event_id ? (
                        <code style={{ fontSize: '11px', color: 'var(--status-success)' }}>{evt.cce_ack_event_id.slice(0, 18)}...</code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Pending Ack</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedEvent(evt)}
                        title="View CloudEvents JSON Envelope"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-dialog" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>CloudEvents 1.0 Payload Inspector</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><strong>Event ID:</strong> <code>{selectedEvent.event_id}</code></div>
                <div><strong>Delivery Status:</strong> <span className="badge badge-success">{selectedEvent.status}</span></div>
                <div><strong>CCE Ack Event ID:</strong> <code>{selectedEvent.cce_ack_event_id || 'None'}</code></div>
                <div><strong>Correlation ID:</strong> <code>{selectedEvent.correlation_id}</code></div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  CloudEvents Ingestion Envelope (application/json):
                </div>
                <div className="code-box">
                  <pre>{JSON.stringify(JSON.parse(selectedEvent.payload), null, 2)}</pre>
                </div>
              </div>

              {selectedEvent.last_error && (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--status-danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--status-danger)' }}>
                  <strong>Last Error:</strong> {selectedEvent.last_error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
