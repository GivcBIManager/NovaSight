/**
 * HowItWorks Component
 * 
 * 4-step horizontal timeline showing the product workflow.
 * Animated on scroll with flowing dots between steps.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Database, GitBranch, Layers, BarChart3 } from 'lucide-react';
import { SectionHeader } from '@/components/marketing/shared';

export interface HowItWorksProps {
  /** Additional CSS classes */
  className?: string;
}

const steps = [
  {
    number: 1,
    title: 'Connect',
    description: 'Configure your data sources with our 20+ pre-built connectors',
    icon: Database,
    color: 'indigo',
  },
  {
    number: 2,
    title: 'Transform',
    description: 'Build automated pipelines with dbt and Apache Airflow',
    icon: GitBranch,
    color: 'green',
  },
  {
    number: 3,
    title: 'Model',
    description: 'Create semantic models with business logic and metrics',
    icon: Layers,
    color: 'purple',
  },
  {
    number: 4,
    title: 'Visualize',
    description: 'Build interactive dashboards with AI-powered insights',
    icon: BarChart3,
    color: 'cyan',
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  indigo: {
    border: 'border-accent-indigo',
    bg: 'bg-accent-indigo/10',
    text: 'text-accent-indigo',
    glow: 'shadow-[0_0_20px_hsl(var(--color-accent-indigo)/0.4)]',
  },
  green: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    glow: 'shadow-[0_0_20px_hsl(var(--color-neon-green)/0.4)]',
  },
  purple: {
    border: 'border-accent-purple',
    bg: 'bg-accent-purple/10',
    text: 'text-accent-purple',
    glow: 'shadow-[0_0_20px_hsl(var(--color-accent-purple)/0.4)]',
  },
  cyan: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    glow: 'shadow-[0_0_20px_hsl(var(--color-neon-cyan)/0.4)]',
  },
};

// Animated connecting line with flowing dots
function ConnectingLine({ animate }: { animate: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  return (
    <div className="relative hidden h-0.5 flex-1 bg-border/50 md:block">
      {shouldAnimate && (
        <motion.div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent-purple"
          initial={{ left: '0%', opacity: 0 }}
          animate={{
            left: ['0%', '100%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}

// Single step component
function Step({
  step,
  index,
  isLast,
}: {
  step: typeof steps[0];
  index: number;
  isLast: boolean;
}) {
  const colors = colorMap[step.color];
  const Icon = step.icon;

  return (
    <>
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
      >
        {/* Step number circle */}
        <motion.div
          className={cn(
            'relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2',
            colors.border,
            colors.bg
          )}
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <span className={cn('text-2xl font-bold', colors.text)}>
            {step.number}
          </span>
          {/* Glow effect on hover */}
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full opacity-0 transition-opacity',
              colors.glow
            )}
            whileHover={{ opacity: 1 }}
          />
        </motion.div>

        {/* Icon */}
        <div className={cn('mb-3', colors.text)}>
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-xl font-semibold text-foreground">
          {step.title}
        </h3>

        {/* Description */}
        <p className="max-w-[200px] text-sm text-muted-foreground">
          {step.description}
        </p>
      </motion.div>

      {/* Connecting line (except after last step) */}
      {!isLast && <ConnectingLine animate />}
    </>
  );
}

export function HowItWorks({ className }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      className={cn('py-20 md:py-28 lg:py-32', className)}
    >
      <div className="container mx-auto px-4">
        <SectionHeader
          badge="How It Works"
          title="From Raw Data to Insights in 4 Simple Steps"
          titleHighlight="4 Simple Steps"
          subtitle="Our streamlined workflow gets you from data chaos to actionable insights faster than ever."
          align="center"
          className="mb-16"
        />

        {/* Desktop: Horizontal timeline */}
        <div className="hidden items-start justify-between md:flex">
          {steps.map((step, index) => (
            <Step
              key={step.number}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="space-y-8 md:hidden">
          {steps.map((step, index) => {
            const colors = colorMap[step.color];
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                className="flex gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Number and line */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full border-2',
                      colors.border,
                      colors.bg
                    )}
                  >
                    <span className={cn('text-lg font-bold', colors.text)}>
                      {step.number}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="h-full w-0.5 bg-border/50" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className={cn('mb-2 inline-block', colors.text)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
