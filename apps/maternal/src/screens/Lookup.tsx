import { Icon } from '../components/Icon';
import { useApp } from '../data/store';
import { avatarFor, hasOverdue, initials, openCount, weeks } from '../domain/logic';

export function Lookup() {
  const { women, query, setQuery, openScan, openRegister, openWoman } = useApp();

  const q = query.replace(/\D/g, '');
  const list = q.length >= 4 ? women.filter((w) => w.phone.includes(q)) : women;
  const resultsLabel = q.length >= 4 ? 'Matches' : 'Recently seen';

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', background: 'var(--surface-card)', border: '1.5px solid var(--border-default)', borderRadius: 14 }}>
          <Icon path="M20 20l-3.2-3.2" size={19} stroke="var(--ml-ink-500)" strokeWidth={2} style={{ flex: 'none' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Phone number or ABHA"
            inputMode="numeric"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--text-strong)' }}
          />
        </div>
        <button
          onClick={openScan}
          title="Scan ABHA QR"
          style={{ flex: 'none', width: 48, borderRadius: 14, border: 'none', background: 'var(--ml-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
        >
          <Icon path="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" size={22} strokeWidth={1.9} />
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon path="M12 8h.01M11 12h1v4h1" size={13} stroke="currentColor" strokeWidth={2} />
        Search by phone or ABHA only — never by name (BR-101)
      </p>

      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 10px' }}>{resultsLabel}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((w) => {
          const k = weeks(w);
          const meta = [w.village, k === null ? 'newly registered' : k + ' wks', w.g ? 'G' + w.g + 'P' + w.p : null, w.risk].filter(Boolean).join(' · ');
          const oc = openCount(w);
          return (
            <button
              key={w.id}
              onClick={() => openWoman(w.id)}
              style={{ textAlign: 'left', width: '100%', padding: '13px 14px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, cursor: 'pointer', boxShadow: 'var(--shadow-xs)', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ flex: 'none', width: 42, height: 42, borderRadius: '50%', background: avatarFor(w.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 15 }}>{initials(w.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
                  {w.hi && <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 'none', whiteSpace: 'nowrap' }}>{w.hi}</span>}
                </span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{meta}</span>
              </span>
              {oc > 0 && (
                <span style={{ flex: 'none', minWidth: 24, height: 24, padding: '0 7px', borderRadius: 12, background: hasOverdue(w) ? '#994242' : '#6165DE', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{oc}</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={openRegister}
        style={{ marginTop: 16, width: '100%', padding: 14, border: '1.5px dashed var(--ml-blue-30)', borderRadius: 16, background: 'var(--surface-brand-soft)', color: 'var(--ml-blue)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Icon path="M12 5v14M5 12h14" size={18} strokeWidth={2} />
        Register a pregnant woman
      </button>
    </div>
  );
}
