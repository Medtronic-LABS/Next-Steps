// Generic stroke-path icon matching the prototype's 24×24 SVG conventions.
interface IconProps {
  path: string;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  style?: React.CSSProperties;
}

export function Icon({
  path,
  size = 22,
  stroke = 'currentColor',
  strokeWidth = 1.9,
  fill = 'none',
  style,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
