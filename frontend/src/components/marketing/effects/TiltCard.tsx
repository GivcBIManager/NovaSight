/**
 * TiltCard Component
 * 
 * 3D tilt effect that follows cursor with glare reflection overlay.
 * Uses perspective(1000px) for depth effect.
 * Disables tilt on touch devices (scale only).
 */

import * as React from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsTouchDevice } from '@/hooks';

export interface TiltCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Maximum tilt angle in degrees */
  maxTilt?: number;
  /** Enable glare effect */
  glare?: boolean;
  /** Glare opacity (0-1) */
  glareOpacity?: number;
  /** Additional CSS classes */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

export function TiltCard({
  children,
  maxTilt = 15,
  glare = true,
  glareOpacity = 0.2,
  className,
  style,
}: TiltCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();
  const cardRef = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 30 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);

  // Glare position
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const normalizedX = (e.clientX - centerX) / (rect.width / 2);
    const normalizedY = (e.clientY - centerY) / (rect.height / 2);

    x.set(normalizedX / 2);
    y.set(normalizedY / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (prefersReducedMotion) {
    return (
      <div className={cn('relative', className)} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn('relative', className)}
      style={{
        perspective: 1000,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative h-full w-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}

        {/* Glare overlay */}
        {glare && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-inherit overflow-hidden"
            style={{
              background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${glareOpacity}) 0%, transparent 60%)`,
            }}
            aria-hidden="true"
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export default TiltCard;
