import { Icon } from '../components/Icon';
import { useApp } from '../data/store';
import { CAT, LVL, OPTMETA, ROLES, TINT } from '../domain/constants';
import { fmtLong, gestText } from '../domain/logic';

const OPTAC: Record<string, string> = {
  REFERRAL: '#1E14BE', ANC_VISIT: '#6165DE', PMSMA_VISIT: '#6165DE',
  FOLLOW_UP: '#994242', LAB: '#2E9E6B', IMAGING: '#6165DE', TREATMENT: '#C35721',
};

export function Capture() {
  const { women, role, cap, openOption, removeStaged, saveCapture } = useApp();
  if (!role || !cap) return null;
  const r = ROLES[role];
  const w = women.find((x) => x.id === cap.womanId);
  const n = cap.steps.length;

  return (
    <>
      <div style={{ padding: '14px 16px 132px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            For <strong style={{ color: 'var(--text-body)' }}>{w?.name}</strong> · {w ? gestText(w) + ' · ' + w.risk : ''}
          </div>
          <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-brand-soft)', color: 'var(--ml-blue)', fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '5px 12px' }}>
            <Icon path="M12 7v5l3 2" size={14} strokeWidth={2} /> Visit · now
          </span>
        </div>
        <h2 style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text-strong)', margin: '0 0 6px' }}>What happens next?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px', lineHeight: 1.45 }}>Options available to you as {r.name} at {r.facility}.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 24 }}>
          {r.options.map((k) => {
            const ac = OPTAC[k] || '#1E14BE';
            return (
              <button
                key={k}
                onClick={() => openOption(k)}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14, minHeight: 96, textAlign: 'left', padding: 13, border: '1px solid var(--border-subtle)', borderRadius: 16, background: TINT[ac] || '#EFEDFF', cursor: 'pointer' }}
              >
                <Icon path={CAT[k].icon} size={22} stroke={ac} strokeWidth={1.8} />
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.15 }}>{OPTMETA[k]?.label ?? CAT[k].label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 11 }}>
          This visit · {n} step{n === 1 ? '' : 's'}
        </div>
        {n > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cap.steps.map((s) => {
              const lm = LVL[s.level];
              const cm = CAT[s.cat];
              const detail = s.cat === 'REFERRAL' ? 'To ' + lm.facility + ' · sent on save'
                : s.session ? 'PMSMA session · ' + fmtLong(s.due) + ' · ' + lm.facility
                : s.due ? fmtLong(s.due) + ' · ' + lm.facility
                : 'At ' + lm.facility + ' · no date needed';
              return (
                <div key={s.sid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${lm.c}`, borderRadius: 16, boxShadow: 'var(--shadow-xs)' }}>
                  <span style={{ flex: 'none', width: 42, height: 42, borderRadius: 12, background: lm.s, display: 'flex', alignItems: 'center', justifyContent: 'center', color: lm.c }}>
                    <Icon path={cm.icon} size={21} stroke="currentColor" strokeWidth={1.8} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>{s.cat === 'REFERRAL' ? 'Referral to ' + lm.label : cm.label}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{detail}</span>
                  </span>
                  <button onClick={() => removeStaged(s.sid)} title="Remove" style={{ flex: 'none', width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon path="M6 6l12 12M18 6L6 18" size={17} stroke="currentColor" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ border: '1.5px dashed var(--border-default)', borderRadius: 16, padding: '28px 22px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
            Tap an option above to add the first next step.
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px 22px', background: 'linear-gradient(to top, var(--surface-page) 74%, transparent)', zIndex: 30, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 'none', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.3 }}>≈ {20 + n * 15}s<br />this visit</div>
        <button
          onClick={saveCapture}
          style={{ flex: 1, padding: 16, border: 'none', borderRadius: 16, background: 'var(--ml-blue)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: n ? 1 : 0.5, boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
        >
          <Icon path="M20 6L9 17l-5-5" size={18} strokeWidth={2.6} />Save · schedule reminders
        </button>
      </div>
    </>
  );
}
