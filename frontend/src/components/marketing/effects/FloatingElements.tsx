/**
 * FloatingElements Component
 * 
 * Decorative floating shapes for background atmospherics.
 * Generates random positions with slow float animation.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ShapeType = 'circle' | 'square' | 'triangle' | 'ring' | 'cross';

interface FloatingElement {
  id: number;
  shape: ShapeType;
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  opacity: number;
  color: string;
}

export interface FloatingElementsProps {
  /** Number of floating elements */
  count?: number;
  /** Allowed shapes */
  shapes?: ShapeType[];
  /** Color palette */
  colors?: string[];
  /** Size range [min, max] */
  sizeRange?: [number, number];
  /** Additional CSS classes */
  className?: string;
}

// Deterministic pseudo-random based on seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateElements(
  count: number,
  shapes: ShapeType[],
  colors: string[],
  sizeRange: [number, number]
): FloatingElement[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 1000;
    return {
      id: i,
      shape: shapes[Math.floor(seededRandom(seed) * shapes.length)],
      size: sizeRange[0] + seededRandom(seed + 1) * (sizeRange[1] - sizeRange[0]),
      x: seededRandom(seed + 2) * 100,
      y: seededRandom(seed + 3) * 100,
      delay: seededRandom(seed + 4) * 5,
      duration: 15 + seededRandom(seed + 5) * 20,
      opacity: 0.1 + seededRandom(seed + 6) * 0.2,
      color: colors[Math.floor(seededRandom(seed + 7) * colors.length)],
    };
  });
}

function Shape({ type, size, color }: { type: ShapeType; size: number; color: string }) {
  switch (type) {
    case 'circle':
      return (
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: color,
          }}
        />
      );
    case 'square':
      return (
        <div
          className="rounded-lg rotate-45"
          style={{
            width: size,
            height: size,
            background: color,
          }}
        />
      );
    case 'triangle':
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
          }}
        />
      );
    case 'ring':
      return (
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            border: `2px solid ${color}`,
            background: 'transparent',
          }}
        />
      );
    case 'cross':
      return (
        <div className="relative" style={{ width: size, height: size }}>
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2"
            style={{ width: size, height: 2, background: color }}
          />
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{ width: 2, height: size, background: color }}
          />
        </div>
      );
    default:
      return null;
  }
}

export function FloatingElements({
  count = 15,
  shapes = ['circle', 'square', 'ring'],
  colors = [
    'hsl(var(--color-accent-indigo))',
    'hsl(var(--color-accent-purple))',
    'hsl(var(--color-neon-cyan))',
    'hsl(var(--color-neon-pink))',
  ],
  sizeRange = [8, 32],
  className,
}: FloatingElementsProps) {
  const prefersReducedMotion = useReducedMotion();

  const elements = React.useMemo(
    () => generateElements(count, shapes, colors, sizeRange),
    [count, shapes, colors, sizeRange]
  );

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden="true"
    >
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            opacity: element.opacity,
          }}
          animate={
            prefersReducedMotion
              ? {}
              : {
                  y: [0, -30, 0, 30, 0],
                  x: [0, 20, 0, -20, 0],
                  rotate: [0, 180, 360],
                }
          }
          transition={{
            duration: element.duration,
            delay: element.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Shape type={element.shape} size={element.size} color={element.color} />
        </motion.div>
      ))}
    </div>
  );
}

export default FloatingElements;
