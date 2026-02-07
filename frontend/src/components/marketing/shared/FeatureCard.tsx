/**
 * FeatureCard Component
 * 
 * Feature card with TiltCard and GlassCard effects.
 * Includes icon with colored background and hover glow.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { TiltCard } from '../effects/TiltCard';

type ColorVariant = 'purple' | 'cyan' | 'pink' | 'indigo' | 'green';

const colorMap: Record<ColorVariant, { bg: string; text: string; glow: string }> = {
  purple: {
    bg: 'bg-accent-purple/10',
    text: 'text-accent-purple',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-accent-purple)/0.3)]',
  },
  cyan: {
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-neon-cyan)/0.3)]',
  },
  pink: {
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-neon-pink)/0.3)]',
  },
  indigo: {
    bg: 'bg-accent-indigo/10',
    text: 'text-accent-indigo',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-accent-indigo)/0.3)]',
  },
  green: {
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    glow: 'group-hover:shadow-[0_0_30px_hsl(var(--color-neon-green)/0.3)]',
  },
};

export interface FeatureCardProps {
  /** Icon to display */
  icon: React.ReactNode;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Color variant */
  color?: ColorVariant;
  /** Card size */
  size?: 'sm' | 'md' | 'lg';
  /** Enable tilt effect */
  tilt?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const iconSizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

export function FeatureCard({
  icon,
  title,
  description,
  color = 'purple',
  size = 'md',
  tilt = true,
  className,
}: FeatureCardProps) {
  const colors = colorMap[color];

  const CardContent = (
    <GlassCard
      variant="interactive"
      className={cn(
        'group h-full transition-all duration-base',
        colors.glow,
        sizeClasses[size],
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-xl',
          iconSizeClasses[size],
          colors.bg
        )}
      >
        <span className={cn('text-xl', colors.text)}>{icon}</span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </GlassCard>
  );

  if (tilt) {
    return (
      <TiltCard maxTilt={8} glare glareOpacity={0.1}>
        {CardContent}
      </TiltCard>
    );
  }

  return CardContent;
}

export default FeatureCard;
