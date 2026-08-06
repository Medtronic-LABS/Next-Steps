import { Icon } from '../components/Icon';
import { useApp } from '../data/store';
import { ROLES, ROLE_ORDER } from '../domain/constants';

export function Launcher() {
  const pickRole = useApp((s) => s.pickRole);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--ml-blue)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top) + 46px) 26px 18px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ml-mark-seafoam)', marginBottom: 10 }}>
          Medtronic LABS
        </div>
        <h1 style={{ fontSize: 31, lineHeight: 1.08, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-.02em', color: '#fff' }}>
          Next Steps<br />for Maternal Care
        </h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#D7D4FA', margin: '0 0 22px', maxWidth: 300 }}>
          Close the loop on every high-risk pregnancy, from sub-centre to tertiary. Choose a login to explore the field app.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ROLE_ORDER.map((k) => {
            const role = ROLES[k];
            return (
              <button
                key={k}
                onClick={() => pickRole(k)}
                style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', width: '100%', padding: '13px 14px', border: 'none', borderRadius: 18, background: 'rgba(255,255,255,.10)', cursor: 'pointer' }}
              >
                <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: role.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Icon path={role.icon} size={21} strokeWidth={1.9} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#fff' }}>{role.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#C6C2F2', marginTop: 2 }}>{role.facility}</span>
                </span>
                <Icon path="M9 6l6 6-6 6" size={18} stroke="#fff" strokeWidth={2} style={{ opacity: 0.6, flex: 'none' }} />
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <p style={{ fontSize: 10.5, color: '#9E99D8', margin: '18px 0 6px', lineHeight: 1.5 }}>
          Prototype · MVP v1.0. Coordination data only — no clinical records are ever stored. Offline-first PWA.
        </p>
      </div>
    </div>
  );
}
