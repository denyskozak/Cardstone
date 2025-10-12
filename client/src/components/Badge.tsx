import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';

const toneStyles: Record<string, Pick<CSSProperties, 'background' | 'color' | 'boxShadow'>> = {
  amber: {
    background: 'linear-gradient(90deg, #f97316, #facc15)',
    color: '#0b1324',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)'
  },
  orange: {
    background: 'linear-gradient(90deg, #fb923c, #facc15)',
    color: '#0b1324',
    boxShadow: '0 4px 12px rgba(251, 146, 60, 0.35)'
  },
  emerald: {
    background: 'linear-gradient(90deg, #22c55e, #34d399)',
    color: '#041420',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)'
  },
  sky: {
    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
    color: '#071125',
    boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)'
  },
  slate: {
    background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.95), rgba(100, 116, 139, 0.95))',
    color: '#0b1324',
    boxShadow: '0 4px 12px rgba(100, 116, 139, 0.2)'
  },
  gray: {
    background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.95), rgba(100, 116, 139, 0.95))',
    color: '#0b1324',
    boxShadow: '0 4px 12px rgba(100, 116, 139, 0.2)'
  }
};

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 12px',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  background: 'linear-gradient(90deg, #f97316, #facc15)',
  color: '#0b1324',
  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)'
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  color?: string;
  variant?: 'solid' | 'soft' | 'outline' | 'surface';
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { color = 'amber', variant = 'solid', style, children, ...rest },
  ref
) {
  const tone = toneStyles[color] ?? toneStyles.amber;

  const variantStyles: CSSProperties =
    variant === 'outline'
      ? {
          background: 'transparent',
          color: tone.color,
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: 'none'
        }
      : variant === 'soft' || variant === 'surface'
        ? {
            background: tone.background,
            color: tone.color,
            opacity: 0.9,
            boxShadow: tone.boxShadow
          }
        : tone;

  return (
    <span
      ref={ref}
      style={{
        ...baseStyle,
        ...variantStyles,
        ...style
      }}
      {...rest}
    >
      {children}
    </span>
  );
});
