import { Icon } from '../components/Icon';
import { useApp } from '../data/store';
import { edd, fmt, gestText, initials, mask, stepVM } from '../domain/logic';

export function Journey() {
  const { women, selId, openCapture, openStepMenu } = useApp();
  const w = women.find((x) => x.id === selId);
  if (!w) return null;

  const open = w.steps.filter((s) => s.status === 'OPEN').slice().sort((a, b) => {
    const ka = a.due || a.sent || '';
    const kb = b.due || b.sent || '';
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const done = w.steps.filter((s) => s.status === 'DONE');

  const isHRP = w.risk === 'HRP';
  const eddIso = edd(w);
  const subLine = [
    w.vhi ? `${w.village} (${w.vhi})` : w.village,
    w.age ? w.age + ' yrs' : null,
    w.g ? 'G' + w.g + 'P' + w.p : null,
    w.asha ? 'ASHA ' + w.asha : w.sc,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ padding: '0 0 96px' }}>
      {/* Name band */}
      <div style={{ background: 'var(--ml-blue)', padding: '18px 16px 17px' }}>
        <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
          <span style={{ flex: 'none', width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17 }}>{initials(w.name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</div>
            <div style={{ fontSize: 12.5, color: '#B6B1EE', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subLine}</div>
          </div>
        </div>
      </div>

      {/* Gestation + EDD + risk + phone card */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            <Stat label="Gestation" value={gestText(w)} />
            <div style={{ width: 1, background: 'var(--border-subtle)' }} />
            <Stat label="EDD" value={eddIso ? fmt(eddIso) : '—'} />
          </div>
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px', background: isHRP ? 'var(--ml-peach)' : '#D9F7E8' }}>
            <Icon path={isHRP ? 'M12 3L2 20h20L12 3zM12 10v4M12 17h.01' : 'M20 6L9 17l-5-5'} size={17} stroke={isHRP ? '#8A3D14' : '#1B6B47'} strokeWidth={2} style={{ flex: 'none' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: isHRP ? '#8A3D14' : '#1B6B47' }}>{isHRP ? 'HRP · high-risk pregnancy' : 'Normal pregnancy'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px' }}>
            <Icon path="M4 5c0 8 7 15 15 15l2.5-2.5-4-4-2.5 1.5a11 11 0 0 1-5-5L11 6.5 7 2.5 4 5z" size={16} stroke="var(--text-muted)" strokeWidth={2} style={{ flex: 'none' }} />
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-body)' }}>{mask(w.phone)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: w.consent ? '#1B6B47' : '#994242' }}>{w.consent ? 'SMS on' : 'SMS off'}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 6px' }}>
        <button onClick={() => openCapture(w.id)} style={{ width: '100%', padding: 16, border: 'none', borderRadius: 16, background: 'var(--ml-blue)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>Enter Next Steps</button>
      </div>

      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Open next steps · {open.length}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Tap a step to mark it done or send a reminder.</div>
      </div>

      <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {open.map((s) => {
          const vm = stepVM(s, w);
          return (
            <button key={s.id} onClick={() => openStepMenu(s.id)} style={{ textAlign: 'left', width: '100%', padding: 14, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${vm.lc}`, borderRadius: 16, boxShadow: 'var(--shadow-xs)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: vm.lsoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: vm.lc }}>
                <Icon path={vm.icon} size={22} stroke="currentColor" strokeWidth={1.8} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>{vm.title}</span>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: vm.dueColor, marginTop: 2 }}>{vm.dueLabel}</span>
              </span>
              <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'var(--ml-blue)' }}>
                <Icon path="M9 6l6 6-6 6" size={20} stroke="currentColor" strokeWidth={2.2} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Update</span>
              </span>
            </button>
          );
        })}
        {open.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>No open steps</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>Her journey is up to date.</div>
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Completed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {done.map((s) => {
              const vm = stepVM(s, w);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 14 }}>
                  <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 10, background: 'var(--ml-peppermint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B6B47' }}>
                    <Icon path="M20 6L9 17l-5-5" size={18} stroke="currentColor" strokeWidth={2.6} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text-body)' }}>{vm.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Completed {fmt(s.cdate)} · {s.cby}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: '14px 15px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-strong)', marginTop: 3 }}>{value}</div>
    </div>
  );
}
