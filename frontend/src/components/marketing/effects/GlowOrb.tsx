/**
 * GlowOrb Component
 * 
 * Floating gradient blur orbs for atmospheric background effects.
 * Uses framer-motion for organic slow drift animation.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const colorMap = {
  purple: 'hsl(var(--color-accent-purple))',
  cyan: 'hsl(var(--color-neon-cyan))',
  pink: 'hsl(var(--color-neon-pink))',
  indigo: 'hsl(var(--color-accent-indigo))',
  green: 'hsl(var(--color-neon-green))',
} as const;

const sizeMap = {
  sm: 200,
  md: 400,
  lg: 600,
  xl: 800,
} as const;

export interface GlowOrbProps {
  /** Orb color variant */
  color: keyof typeof colorMap;
  /** Size of the orb */
  size?: keyof typeof sizeMap;
  /** Position in the container */
  position?: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
  /** Opacity intensity (0-1) */
  intensity?: number;
  /** Enable slow drift animation */
  animate?: boolean;
  /** Blur radius in pixels */
  blur?: number;
  /** Additional CSS classes */
  className?: string;
}

export function GlowOrb({
  color,
  size = 'md',
  position = {},
  intensity = 0.15,
  animate = true,
  blur = 120,
  className,
}: GlowOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const orbSize = sizeMap[size];

  const driftAnimation = shouldAnimate
    ? {
        x: [0, 30, -20, 10, 0],
        y: [0, -20, 30, -10, 0],
        scale: [1, 1.05, 0.95, 1.02, 1],
      }
    : {};

  const driftTransition = shouldAnimate
    ? {
        duration: 20,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'reverse' as const,
      }
    : {};

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute rounded-full',
        className
      )}
      style={{
        width: orbSize,
        height: orbSize,
        background: `radial-gradient(circle, ${colorMap[color]} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity: intensity,
        ...position,
      }}
      animate={driftAnimation}
      transition={driftTransition}
      aria-hidden="true"
    />
  );
}

export default GlowOrb;
