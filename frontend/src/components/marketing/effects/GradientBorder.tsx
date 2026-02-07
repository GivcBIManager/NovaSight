/**
 * GradientBorder Component
 * 
 * Wrapper component with animated Möbius strip gradient border.
 * Creates an infinity-loop flowing effect around the content.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GradientBorderProps {
  /** Content to wrap */
  children: React.ReactNode;
  /** Border width in pixels */
  borderWidth?: number;
  /** Border radius */
  borderRadius?: string;
  /** Gradient colors */
  colors?: string[];
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Additional CSS classes for wrapper */
  className?: string;
  /** Additional CSS classes for inner content */
  innerClassName?: string;
}

export function GradientBorder({
  children,
  borderWidth = 2,
  borderRadius = '1rem',
  colors = [
    'hsl(var(--color-accent-indigo))',
    'hsl(var(--color-accent-purple))',
    'hsl(var(--color-neon-pink))',
    'hsl(var(--color-neon-cyan))',
  ],
  animationDuration = 6,
  className,
  innerClassName,
}: GradientBorderProps) {
  const prefersReducedMotion = useReducedMotion();
  const gradientId = React.useId();

  return (
    <div
      className={cn('relative p-[var(--border-width)]', className)}
      style={{
        '--border-width': `${borderWidth}px`,
        borderRadius,
      } as React.CSSProperties}
    >
      {/* SVG Möbius strip border */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ borderRadius }}
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Animated gradient that flows along the path */}
          <linearGradient id={`mobius-gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {colors.map((color, i) => (
              <motion.stop
                key={i}
                offset={`${(i / colors.length) * 100}%`}
                stopColor={color}
                animate={prefersReducedMotion ? {} : {
                  offset: [
                    `${(i / colors.length) * 100}%`,
                    `${((i + colors.length) / colors.length) * 100}%`,
                  ],
                }}
                transition={{
                  duration: animationDuration,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
          </linearGradient>
          
          {/* Glow filter */}
          <filter id={`mobius-glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Möbius strip path - figure-8 infinity loop around the border */}
        <motion.rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke={`url(#mobius-gradient-${gradientId})`}
          strokeWidth={borderWidth}
          filter={`url(#mobius-glow-${gradientId})`}
          initial={{ pathLength: 0, opacity: 0.8 }}
          animate={prefersReducedMotion ? { pathLength: 1, opacity: 1 } : {
            strokeDashoffset: [0, -1000],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            strokeDashoffset: {
              duration: animationDuration,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: {
              duration: animationDuration / 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          style={{
            strokeDasharray: '60 20 30 20',
          }}
        />

        {/* Secondary trace for depth effect */}
        <motion.rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke={`url(#mobius-gradient-${gradientId})`}
          strokeWidth={borderWidth * 0.5}
          opacity={0.4}
          initial={{ pathLength: 0 }}
          animate={prefersReducedMotion ? { pathLength: 1 } : {
            strokeDashoffset: [0, 1000],
          }}
          transition={{
            duration: animationDuration * 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            strokeDasharray: '40 30 20 30',
          }}
        />
      </svg>

      {/* Ambient glow layer */}
      <motion.div
        className="absolute inset-0 opacity-30 blur-2xl"
        style={{
          background: `linear-gradient(45deg, ${colors.join(', ')})`,
          borderRadius,
        }}
        animate={prefersReducedMotion ? {} : {
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: animationDuration * 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        aria-hidden="true"
      />

      {/* Inner content */}
      <div
        className={cn('relative bg-bg-primary', innerClassName)}
        style={{ borderRadius: `calc(${borderRadius} - ${borderWidth}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

export default GradientBorder;
