// Einklang-Bildmarke (exakte SVG-Pfade aus den Einklang-Assets) + Wortmarke.

interface Props {
  size?: number;
  /** Wortmarke ausgeben? */
  withWordmark?: boolean;
  color?: string;
  wordmarkSize?: number;
}

export function Logo({ size = 28, withWordmark = true, color = '#007889', wordmarkSize = 18 }: Props) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 250 250" fill="none" aria-hidden="true">
        <path
          fill={color}
          d="M131.42,165.38s26.56-20.15,36.18-62.76c7.41-32.83-2.05-69.33-8.07-70.6-8.09-1.7-30.55,24.38-38.74,60.61-8.36,37.02,10.63,72.75,10.63,72.75Z"
        />
        <path
          fill={color}
          d="M120.74,133.35s2.97,34.72,35.99,63.31c25.44,22.03,64.35,29.13,68.31,24.41,5.32-6.33-7.07-38.44-35.15-62.76-28.69-24.85-69.15-24.97-69.15-24.97Z"
        />
        <path
          fill={color}
          d="M80.84,139.21c-32.11,10.08-58.92,36.6-56.99,42.45,2.59,7.85,37.67,15.48,73.11,4.35,36.21-11.37,56.32-47.05,56.32-47.05,0,0-30.76-12.84-72.44.25ZM82.51,158.77c-13.6,5.01-30.19,10.86-31.19,8.91-1.25-2.44,11.04-12.11,27.28-17.91,15.52-5.54,29.26-6.11,30.35-3.56,1.04,2.44-11.1,6.92-26.44,12.57Z"
        />
      </svg>
      {withWordmark && (
        <span
          style={{
            fontWeight: 600,
            fontSize: wordmarkSize,
            color,
            letterSpacing: '-0.02em',
          }}
        >
          Einklang
        </span>
      )}
    </span>
  );
}
