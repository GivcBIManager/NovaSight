/**
 * ParallaxLayer Component
 * 
 * Wrapper component for parallax scrolling effects.
 * Uses framer-motion useScroll and useTransform.
 */

import * as React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ParallaxLayerProps {
  /** Content to apply parallax to */
  children: React.ReactNode;
  /** Parallax speed (-1 to 1, negative = opposite direction) */
  speed?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom scroll container ref (defaults to window) */
  containerRef?: React.RefObject<HTMLElement>;
}

export function ParallaxLayer({
  children,
  speed = 0.5,
  className,
  containerRef,
}: ParallaxLayerProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ['start end', 'end start'],
  });

  // Calculate parallax offset based on speed
  // Speed of 1 = moves at 100px, -1 = moves at -100px
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [speed * -100, speed * 100]
  );

  return (
    <motion.div
      ref={ref}
      className={cn('relative', className)}
      style={{ y }}
    >
      {children}
    </motion.div>
  );
}

export default ParallaxLayer;
