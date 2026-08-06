import { Icon } from '../components/Icon';
import { useApp } from '../data/store';
import { CAT, ROLES } from '../domain/constants';
import { worklistVM } from '../domain/logic';
import type { Category } from '../domain/types';

function chip(active: boolean, tone: string) {
  return active
    ? { background: tone, color: '#fff', borderColor: tone }
    : { background: '#fff', color: '#2A2826', borderColor: '#DEDDD8' };
}

export function Worklist() {
  const { women, role, filter, riskFilter, setFilter, setRiskFilter, openWoman } = useApp();
  if (!role) return null;
  const r = ROLES[role];

  const sections = worklistVM(women, role, filter, riskFilter);

  // Category chips: ALL + categories actually present in this role's queue.
  const present: string[] = ['ALL'].concat(
    (Object.keys(CAT) as Category[]).filter((c) =>
      women.some((w) => w.steps.some((s) =>
        s.cat === c && (s.level === r.level || s.owner === role || (role === 'asha' && s.cat === 'PMSMA_VISIT')))))
  );

  const chipBtn = (label: string, active: boolean, onTap: () => void, small = false) => (
    <button
      key={label}
      onClick={onTap}
      style={{
        flex: 'none', padding: small ? '6px 12px' : '7px 13px', borderRadius: 999, border: '1.5px solid',
        fontSize: small ? 12 : 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', ...chip(active, r.accent),
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: '14px 16px 24px' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, margin: '0 -16px 4px', paddingLeft: 16, paddingRight: 16 }}>
        {present.map((c) => chipBtn(c === 'ALL' ? 'All' : CAT[c as Category].label, filter === c, () => setFilter(c)))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Risk</span>
        {([['ALL', 'All'], ['HRP', 'HRP'], ['NORMAL', 'Normal']] as const).map(([k, l]) =>
          chipBtn(l, riskFilter === k, () => setRiskFilter(k), true))}
      </div>

      {sections.map((sec) => (
        <div key={sec.title} style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: sec.dot }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>{sec.title}</span>
            <span style={{ minWidth: 22, padding: '1px 8px', borderRadius: 999, background: sec.pillBg, color: sec.dot, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{sec.count}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sec.rows.map((s, i) => (
              <button
                key={sec.title + i}
                onClick={() => openWoman(s.womanId)}
                style={{ textAlign: 'left', width: '100%', padding: '13px 15px 13px 13px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${s.lc}`, borderRadius: 16, boxShadow: 'var(--shadow-xs)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13 }}
              >
                <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: s.lsoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.lc }}>
                  <Icon path={s.icon} size={22} stroke="currentColor" strokeWidth={1.8} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.womanName}</span>
                  <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-muted)', marginTop: 1 }}>{s.stepLine}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: s.dueColor }}>{s.dueLabel}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.gestFg, background: s.gestBg, borderRadius: 7, padding: '2px 9px', whiteSpace: 'nowrap' }}>{s.gestLabel}</span>
                  </span>
                </span>
                <Icon path="M9 6l6 6-6 6" size={22} stroke="var(--ml-blue)" strokeWidth={2.2} style={{ flex: 'none' }} />
              </button>
            ))}
          </div>
        </div>
      ))}

      {sections.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-body)', marginBottom: 4 }}>Nothing needs attention</div>
          <div style={{ fontSize: 13 }}>No open steps at your level right now.</div>
        </div>
      )}
    </div>
  );
}
