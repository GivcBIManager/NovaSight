/**
 * GridBackground Component
 * 
 * SVG pattern grid with gradient overlay and floating orbs.
 * Used as a decorative background for pages and sections.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GridBackgroundProps {
  /** Additional CSS classes */
  className?: string;
  /** Grid cell size in pixels */
  gridSize?: number;
  /** Show floating orbs */
  showOrbs?: boolean;
  /** Show radial gradient overlay */
  showGradient?: boolean;
  /** Fixed positioning (covers viewport) */
  fixed?: boolean;
  /** Grid line opacity (0-1) */
  gridOpacity?: number;
}

export function GridBackground({
  className,
  gridSize = 40,
  showOrbs = true,
  showGradient = true,
  fixed = false,
  gridOpacity = 0.1,
}: GridBackgroundProps) {
  return (
    <div
      className={cn(
        'pointer-events-none select-none overflow-hidden',
        fixed ? 'fixed inset-0' : 'absolute inset-0',
        className
      )}
      aria-hidden="true"
    >
      {/* SVG Grid Pattern */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid-pattern"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
              style={{ opacity: gridOpacity }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Radial Gradient Overlay */}
      {showGradient && (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--color-accent-indigo) / 0.15), transparent),
              radial-gradient(ellipse 60% 40% at 80% 50%, hsl(var(--color-accent-purple) / 0.1), transparent),
              radial-gradient(ellipse 50% 30% at 20% 80%, hsl(var(--color-neon-cyan) / 0.08), transparent)
            `,
          }}
        />
      )}

      {/* Floating Orbs */}
      {showOrbs && (
        <>
          <FloatingOrb
            size={400}
            color="var(--color-accent-indigo)"
            opacity={0.15}
            top="10%"
            left="20%"
            delay={0}
          />
          <FloatingOrb
            size={300}
            color="var(--color-accent-purple)"
            opacity={0.12}
            top="60%"
            right="15%"
            delay={2}
          />
          <FloatingOrb
            size={250}
            color="var(--color-neon-cyan)"
            opacity={0.1}
            bottom="20%"
            left="10%"
            delay={4}
          />
        </>
      )}

      {/* Noise Texture Overlay (subtle) */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

interface FloatingOrbProps {
  size: number;
  color: string;
  opacity: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
}

function FloatingOrb({
  size,
  color,
  opacity,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: FloatingOrbProps) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl"
      style={{
        width: size,
        height: size,
        background: `hsl(${color})`,
        opacity,
        top,
        left,
        right,
        bottom,
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export default GridBackground;
