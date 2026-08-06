import { Icon } from './Icon';
import { useApp } from '../data/store';

export function Toast() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 80,
        background: 'var(--ml-ink-900)', color: '#fff', fontSize: 13, fontWeight: 500,
        padding: '11px 18px', borderRadius: 12, boxShadow: 'var(--shadow-md)',
        animation: 'nsToast .2s ease', maxWidth: '84%', textAlign: 'center',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      <Icon path="M20 6L9 17l-5-5" size={16} stroke="var(--ml-seafoam)" strokeWidth={2.4} style={{ flex: 'none' }} />
      {toast}
    </div>
  );
}
