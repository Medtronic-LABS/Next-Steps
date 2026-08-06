import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useApp } from '../data/store';
import { ROLES, TABMETA } from '../domain/constants';
import { alertsVM } from '../domain/logic';
import type { TabKey } from '../domain/types';

const TAB_KEYS: TabKey[] = ['lookup', 'worklist', 'alerts'];

function syncLabel(ts: number | undefined): string {
  if (!ts) return 'Not yet synced';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `Synced ${hrs} h ago`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const {
    role, screen, tab, selId, women, acked, lastSynced,
    switchRole, back, setTab,
  } = useApp();

  if (!role) return null;
  const r = ROLES[role];

  const showBack = screen === 'journey' || screen === 'capture' || screen === 'register';
  const showTabs = TAB_KEYS.includes(screen as TabKey);

  const selWoman = women.find((w) => w.id === selId);
  let title = '';
  let sub = '';
  if (screen === 'lookup') { title = 'Find a pregnant woman'; sub = r.facility; }
  else if (screen === 'worklist') { title = 'Worklist'; sub = r.name + ' · ' + r.facility; }
  else if (screen === 'alerts') { title = 'Alerts'; sub = r.name; }
  else if (screen === 'journey') { title = selWoman ? selWoman.name : 'Journey'; sub = 'Full pregnancy journey'; }
  else if (screen === 'capture') { title = 'Next steps'; sub = 'Coordination only — no clinical data'; }
  else if (screen === 'register') { title = 'Register'; sub = r.name + ' · ' + r.facility; }

  const alertCount = alertsVM(women, role, acked).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          flex: 'none', padding: 'calc(env(safe-area-inset-top) + 14px) 18px 12px',
          background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        {showBack && (
          <button
            onClick={back}
            aria-label="Back"
            style={{
              flex: 'none', width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border-subtle)',
              background: 'var(--surface-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon path="M15 6l-6 6 6 6" size={20} stroke="var(--ml-ink-800)" strokeWidth={2} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
        </div>
        <SyncChip ts={lastSynced} />
        <button
          onClick={switchRole}
          title="Switch login"
          style={{
            flex: 'none', height: 38, padding: '0 11px', borderRadius: 12, border: 'none',
            background: r.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12.5,
          }}
        >
          {r.short}
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>{children}</div>

      {/* Bottom tabs */}
      {showTabs && (
        <div
          style={{
            flex: 'none', display: 'flex', background: 'var(--surface-card)',
            borderTop: '1px solid var(--border-subtle)', padding: '8px 8px calc(env(safe-area-inset-bottom) + 14px)',
          }}
        >
          {TAB_KEYS.map((k) => {
            const active = tab === k;
            const color = active ? r.accent : '#909090';
            const badge = k === 'alerts' && alertCount ? String(alertCount) : '';
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', position: 'relative' }}
              >
                {badge && (
                  <span style={{ position: 'absolute', top: 2, left: '50%', marginLeft: 6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--ml-merlot)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
                )}
                <Icon path={TABMETA[k].icon} size={23} stroke={color} strokeWidth={1.9} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{TABMETA[k].label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SyncChip({ ts }: { ts: number | undefined }) {
  return (
    <span
      title={syncLabel(ts)}
      style={{
        flex: 'none', display: 'flex', alignItems: 'center', gap: 5,
        background: 'var(--surface-brand-soft)', color: 'var(--ml-blue)',
        fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '5px 9px', whiteSpace: 'nowrap',
      }}
    >
      <Icon path="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 0 0-14-3M4 16a8 8 0 0 0 14 3" size={13} stroke="var(--ml-blue)" strokeWidth={2} />
      {syncLabel(ts).replace('Synced ', '').replace('Not yet synced', 'Local')}
    </span>
  );
}
