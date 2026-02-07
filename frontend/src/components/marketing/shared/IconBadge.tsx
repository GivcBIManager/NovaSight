/**
 * IconBadge Component
 * 
 * Icon wrapper with colored background circle.
 * Multiple color variants with optional glow effect.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

type ColorVariant = 'purple' | 'cyan' | 'pink' | 'indigo' | 'green' | 'default';

const colorStyles: Record<ColorVariant, { bg: string; text: string; glow: string }> = {
  purple: {
    bg: 'bg-accent-purple/15',
    text: 'text-accent-purple',
    glow: 'shadow-[0_0_20px_hsl(var(--color-accent-purple)/0.3)]',
  },
  cyan: {
    bg: 'bg-neon-cyan/15',
    text: 'text-neon-cyan',
    glow: 'shadow-[0_0_20px_hsl(var(--color-neon-cyan)/0.3)]',
  },
  pink: {
    bg: 'bg-neon-pink/15',
    text: 'text-neon-pink',
    glow: 'shadow-[0_0_20px_hsl(var(--color-neon-pink)/0.3)]',
  },
  indigo: {
    bg: 'bg-accent-indigo/15',
    text: 'text-accent-indigo',
    glow: 'shadow-[0_0_20px_hsl(var(--color-accent-indigo)/0.3)]',
  },
  green: {
    bg: 'bg-neon-green/15',
    text: 'text-neon-green',
    glow: 'shadow-[0_0_20px_hsl(var(--color-neon-green)/0.3)]',
  },
  default: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    glow: '',
  },
};

type SizeVariant = 'sm' | 'md' | 'lg' | 'xl';

const sizeStyles: Record<SizeVariant, { container: string; icon: string }> = {
  sm: { container: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { container: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { container: 'h-12 w-12', icon: 'h-6 w-6' },
  xl: { container: 'h-14 w-14', icon: 'h-7 w-7' },
};

export interface IconBadgeProps {
  /** Icon to display */
  icon: React.ReactNode;
  /** Color variant */
  color?: ColorVariant;
  /** Size variant */
  size?: SizeVariant;
  /** Enable glow effect */
  glow?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function IconBadge({
  icon,
  color = 'purple',
  size = 'md',
  glow = false,
  className,
}: IconBadgeProps) {
  const colorClasses = colorStyles[color];
  const sizeClasses = sizeStyles[size];

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-xl',
        colorClasses.bg,
        colorClasses.text,
        sizeClasses.container,
        glow && colorClasses.glow,
        className
      )}
      aria-hidden="true"
    >
      <span className={sizeClasses.icon}>{icon}</span>
    </div>
  );
}

export default IconBadge;
