import { Icon } from '../components/Icon';
import { useApp } from '../data/store';
import { alertsVM } from '../domain/logic';

export function Alerts() {
  const { women, role, acked, openWoman, ackAlert, showToast } = useApp();
  if (!role) return null;
  const alerts = alertsVM(women, role, acked);

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{ display: 'flex', gap: 10, padding: '13px 14px', background: 'var(--surface-brand-soft)', borderRadius: 14, marginBottom: 16 }}>
        <Icon path="M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6zM10 20a2 2 0 0 0 4 0" size={20} stroke="var(--ml-blue)" strokeWidth={1.9} style={{ flex: 'none', marginTop: 1 }} />
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ml-blue)' }}>
          Each alert means <strong>a pregnant woman needs attention</strong> — routed to her own sub-centre. Never a score of anyone's work (BR-019).
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.map((a) => (
          <div key={a.stepId} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${a.tone}`, borderRadius: 14, boxShadow: 'var(--shadow-xs)', padding: '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: a.tone, whiteSpace: 'nowrap' }}>{a.typeLabel}</span>
              {a.acked && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '1px 6px' }}>Working on it</span>}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>
              {a.womanName} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12.5 }}>{a.village}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-body)', marginTop: 3 }}>{a.message}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
              <button onClick={() => openWoman(a.womanId)} style={{ flex: 1, padding: 9, border: 'none', borderRadius: 10, background: 'var(--ml-blue)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Open journey</button>
              <button onClick={() => showToast('Dialling ' + a.womanName + '…')} style={{ flex: 'none', padding: '9px 14px', border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--surface-card)', color: 'var(--ml-blue)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Call</button>
              <button onClick={() => ackAlert(a.stepId)} style={{ flex: 'none', padding: '9px 14px', border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--surface-card)', color: 'var(--text-body)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Ack</button>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-body)', marginBottom: 4 }}>No open alerts</div>
          <div style={{ fontSize: 13 }}>Every pregnant woman in your area is on track.</div>
        </div>
      )}
    </div>
  );
}
