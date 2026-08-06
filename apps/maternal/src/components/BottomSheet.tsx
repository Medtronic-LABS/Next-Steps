import type { ReactNode } from 'react';

interface BottomSheetProps {
  onDismiss: () => void;
  children: ReactNode;
}

/** Backdrop + slide-up sheet, matching the prototype's dialog chrome. */
export function BottomSheet({ onDismiss, children }: BottomSheetProps) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(11,11,18,.42)', zIndex: 60,
        display: 'flex', alignItems: 'flex-end', animation: 'nsFade .16s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--surface-card)', borderRadius: '26px 26px 42px 42px',
          padding: '20px 18px 30px', animation: 'nsSheet .24s var(--ease-out)',
          maxHeight: '88%', overflowY: 'auto',
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--ml-grey)', margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  );
}
