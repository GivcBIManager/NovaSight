/**
 * MagneticButton Component
 * 
 * Interactive button with magnetic cursor-following effect.
 * Fully keyboard accessible.
 */

import * as React from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const variants = {
  gradient: [
    'bg-gradient-primary text-white',
    'hover:shadow-glow-md',
  ],
  outline: [
    'border-2 border-accent-indigo text-accent-indigo',
    'hover:bg-accent-indigo/10',
    'hover:shadow-glow-sm',
  ],
  ghost: [
    'text-foreground',
    'hover:bg-accent/10',
  ],
} as const;

export interface MagneticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: keyof typeof variants;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Enable glow effect on hover */
  glow?: boolean;
  /** Magnetic pull strength (0-1) */
  magneticStrength?: number;
  /** Content */
  children: React.ReactNode;
}

export function MagneticButton({
  variant = 'gradient',
  size = 'md',
  glow = true,
  magneticStrength = 0.3,
  children,
  className,
  disabled,
  ...props
}: MagneticButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || disabled) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * magneticStrength;
    const deltaY = (e.clientY - centerY) * magneticStrength;

    x.set(deltaX);
    y.set(deltaY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const sizeClasses = {
    sm: 'h-9 px-4 text-sm rounded-lg',
    md: 'h-11 px-6 text-base rounded-xl',
    lg: 'h-14 px-8 text-lg rounded-xl',
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        'relative inline-flex items-center justify-center font-medium transition-all duration-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variants[variant],
        glow && 'hover:shadow-glow-md',
        className
      )}
      style={{
        x: springX,
        y: springY,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      whileHover={{ scale: prefersReducedMotion ? 1 : 1.02 }}
      whileTap={{ scale: prefersReducedMotion ? 1 : 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default MagneticButton;
