// Small inline SVG icon set (Feather-style, matching the prototype).

export function Icon({
  path,
  size = 24,
  stroke = 'currentColor',
  width = 2,
  fill = 'none',
}: {
  path: string;
  size?: number;
  stroke?: string;
  width?: number;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function Logo({ size = 17, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function Whatsapp({ size = 18, filled = true }: { size?: number; filled?: boolean }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" stroke="none">
      <path d="M20.5 3.5A11 11 0 0 0 3.2 17L2 22l5.1-1.2A11 11 0 1 0 20.5 3.5Z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth={1.8}>
      <path d="M20.5 3.5A11 11 0 0 0 3.2 17L2 22l5.1-1.2A11 11 0 1 0 20.5 3.5Z" />
      <path
        d="M8.5 8.5c-.3 0-.7.1-1 .5-.4.4-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.3 2.2 3.4 5.3 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.4-.3-.8-.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const PATHS = {
  chevRight: 'm9 18 6-6-6-6',
  chevLeft: 'm15 18-6-6 6-6',
  chevDown: 'm6 9 6 6 6-6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  phone:
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  calendar: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  capture: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v8M8 12h8',
};
