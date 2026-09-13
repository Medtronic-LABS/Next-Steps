import React, { useState, useEffect } from 'react';

export const DeploymentConfigView: React.FC = () => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setConfig(data.config);
      })
      .catch((err) => console.error('Failed to load config:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <form onSubmit={handleSubmit} className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Deployment SLA Intervals & Escalation Rules
          </div>
          {saved && <span style={{ color: 'var(--status-success)', fontSize: '13px', fontWeight: 600 }}>✓ Saved successfully!</span>}
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Referral Stale Escalation Threshold (Days)</label>
            <input
              id="input-referral-stale-days"
              type="number"
              className="form-input"
              value={config.referral_stale_days || '7'}
              onChange={(e) => setConfig({ ...config, referral_stale_days: e.target.value })}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Alerts home sub-centre and ASHA if an open referral is not completed within this window. Default: 7 days.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Step Overdue Alert Threshold (Days)</label>
            <input
              id="input-step-overdue-days"
              type="number"
              className="form-input"
              value={config.step_overdue_days || '3'}
              onChange={(e) => setConfig({ ...config, step_overdue_days: e.target.value })}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Triggers a red OVERDUE notification chip after due date + N days. Default: 3 days.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Monthly PMSMA Clinic Day</label>
            <input
              id="input-pmsma-day"
              type="number"
              min="1"
              max="28"
              className="form-input"
              value={config.pmsma_day_of_month || '9'}
              onChange={(e) => setConfig({ ...config, pmsma_day_of_month: e.target.value })}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Fixed date of the month for Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA) sessions. National standard: 9th.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Quiet Hours Start (DPDP Act)</label>
              <input
                id="input-quiet-start"
                type="time"
                className="form-input"
                value={config.quiet_hours_start || '09:00'}
                onChange={(e) => setConfig({ ...config, quiet_hours_start: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quiet Hours End</label>
              <input
                id="input-quiet-end"
                type="time"
                className="form-input"
                value={config.quiet_hours_end || '19:00'}
                onChange={(e) => setConfig({ ...config, quiet_hours_end: e.target.value })}
              />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No automatic SMS or WhatsApp reminders are dispatched to patients outside these hours.
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Pilot District</label>
              <input
                id="input-pilot-district"
                className="form-input"
                value={config.pilot_district || 'Rewa'}
                onChange={(e) => setConfig({ ...config, pilot_district: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pilot State</label>
              <input
                id="input-pilot-state"
                className="form-input"
                value={config.pilot_state || 'Madhya Pradesh'}
                onChange={(e) => setConfig({ ...config, pilot_state: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="panel-header" style={{ justifyContent: 'flex-end', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <button id="btn-save-deployment-config" type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Deployment Parameters'}
          </button>
        </div>
      </form>
    </div>
  );
};
