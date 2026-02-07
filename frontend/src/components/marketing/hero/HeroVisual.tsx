/**
 * HeroVisual Component
 * 
 * Dashboard mockup with floating metric cards for hero section.
 * Uses TiltCard and GradientBorder for interactive effects.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TiltCard, GradientBorder } from '@/components/marketing/effects';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';

export interface HeroVisualProps {
  /** Additional CSS classes */
  className?: string;
}

// Floating card wrapper with custom animation
function FloatingCard({
  children,
  className,
  delay = 0,
  duration = 4,
  y = 15,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn('absolute', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={
        prefersReducedMotion
          ? { opacity: 1, y: 0 }
          : {
              opacity: 1,
              y: [0, -y, 0],
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0.5, delay }
          : {
              opacity: { duration: 0.5, delay },
              y: {
                duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: delay + 0.5,
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}

// Mini chart component for floating card
function MiniChart() {
  return (
    <svg className="h-8 w-16" viewBox="0 0 64 32">
      <path
        d="M0 24 L12 20 L24 22 L36 12 L48 16 L64 4"
        fill="none"
        stroke="hsl(var(--color-neon-cyan))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0 24 L12 20 L24 22 L36 12 L48 16 L64 4 L64 32 L0 32 Z"
        fill="url(#chartGradient)"
        opacity="0.3"
      />
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--color-neon-cyan))" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Dashboard mockup component
function DashboardMockup() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-bg-primary/80 p-3">
      {/* Header bar */}
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-accent-purple" />
          <div className="h-2 w-24 rounded bg-muted" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-neon-pink/60" />
          <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
          <div className="h-2 w-2 rounded-full bg-neon-green/60" />
        </div>
      </div>

      {/* Sidebar and content */}
      <div className="flex gap-3">
        {/* Sidebar */}
        <div className="hidden w-20 flex-col gap-2 sm:flex">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-6 rounded',
                i === 0 ? 'bg-accent-indigo/30' : 'bg-muted/50'
              )}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {['indigo', 'purple', 'cyan'].map((color, i) => (
              <div
                key={i}
                className="rounded-md bg-[var(--glass-bg)] p-2 backdrop-blur-sm"
              >
                <div className={cn('mb-1 h-1.5 w-6 rounded', `bg-accent-${color}`)} />
                <div className="h-3 w-10 rounded bg-muted" />
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="rounded-md bg-[var(--glass-bg)] p-3 backdrop-blur-sm">
            <div className="mb-2 h-2 w-16 rounded bg-muted" />
            <svg className="h-20 w-full" viewBox="0 0 200 80">
              {/* Chart bars */}
              {[30, 45, 35, 60, 50, 70, 55, 80, 65, 90, 75, 85].map((h, i) => (
                <rect
                  key={i}
                  x={i * 16 + 2}
                  y={80 - h}
                  width="12"
                  height={h}
                  rx="2"
                  fill={`hsl(var(--color-accent-indigo) / ${0.3 + (h / 100) * 0.7})`}
                />
              ))}
            </svg>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-[var(--glass-bg)] p-2 backdrop-blur-sm">
              <div className="mb-1 h-1.5 w-10 rounded bg-muted" />
              <div className="flex justify-center">
                <svg className="h-10 w-10" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="none"
                    stroke="hsl(var(--color-muted))"
                    strokeWidth="4"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="none"
                    stroke="hsl(var(--color-accent-purple))"
                    strokeWidth="4"
                    strokeDasharray="70 30"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div className="rounded-md bg-[var(--glass-bg)] p-2 backdrop-blur-sm">
              <div className="mb-1 h-1.5 w-12 rounded bg-muted" />
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full w-3/4 rounded-full bg-neon-cyan" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full w-1/2 rounded-full bg-neon-green" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroVisual({ className }: HeroVisualProps) {
  return (
    <div className={cn('relative mx-auto w-full max-w-4xl', className)}>
      {/* Main dashboard card */}
      <TiltCard maxTilt={8} glare glareOpacity={0.1}>
        <GradientBorder borderWidth={2} borderRadius="1rem">
          <div className="h-[280px] w-full sm:h-[320px] md:h-[380px]">
            <DashboardMockup />
          </div>
        </GradientBorder>
      </TiltCard>

      {/* Floating metric card - Revenue */}
      <FloatingCard
        className="right-[-20px] top-[-20px] z-10 sm:right-[-40px] sm:top-[-30px]"
        delay={0.2}
        duration={3.5}
        y={12}
      >
        <div className="rounded-lg border border-neon-green/30 bg-bg-primary/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neon-green" />
            <span className="text-xs text-muted-foreground sm:text-sm">Revenue</span>
          </div>
          <p className="mt-1 text-lg font-bold text-neon-green sm:text-xl">↑ 24%</p>
        </div>
      </FloatingCard>

      {/* Floating metric card - Mini Chart */}
      <FloatingCard
        className="bottom-[-10px] left-[-20px] z-10 sm:bottom-[-20px] sm:left-[-40px]"
        delay={0.4}
        duration={4.5}
        y={18}
      >
        <div className="rounded-lg border border-neon-cyan/30 bg-bg-primary/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-neon-cyan" />
            <span className="text-xs text-muted-foreground sm:text-sm">Sales</span>
          </div>
          <MiniChart />
        </div>
      </FloatingCard>

      {/* Floating metric card - AI Query */}
      <FloatingCard
        className="left-[-10px] top-[20%] z-10 sm:left-[-30px]"
        delay={0.6}
        duration={5}
        y={10}
      >
        <div className="rounded-lg border border-accent-purple/30 bg-bg-primary/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-purple" />
            <span className="text-xs text-accent-purple sm:text-sm">AI Query</span>
          </div>
          <p className="mt-1 max-w-[140px] truncate text-xs text-muted-foreground sm:max-w-[180px] sm:text-sm">
            "Show me top customers"
          </p>
        </div>
      </FloatingCard>
    </div>
  );
}

export default HeroVisual;
