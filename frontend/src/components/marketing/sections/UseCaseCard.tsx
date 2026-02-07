/**
 * UseCaseCard Component
 * 
 * Problem → Solution layout for use case spotlights.
 * Shows before/after with visual transformation.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

export interface UseCaseCardProps {
  /** Use case title */
  title: string;
  /** Problem description (before) */
  problem: {
    title: string;
    points: string[];
  };
  /** Solution description (after) */
  solution: {
    title: string;
    points: string[];
  };
  /** Icon for the use case */
  icon: React.ReactNode;
  /** Color variant */
  color?: 'purple' | 'cyan' | 'pink' | 'indigo' | 'green';
  /** Additional CSS classes */
  className?: string;
}

const colorStyles = {
  purple: {
    icon: 'bg-accent-purple/10 text-accent-purple',
    solution: 'border-accent-purple/30 bg-accent-purple/5',
  },
  cyan: {
    icon: 'bg-neon-cyan/10 text-neon-cyan',
    solution: 'border-neon-cyan/30 bg-neon-cyan/5',
  },
  pink: {
    icon: 'bg-neon-pink/10 text-neon-pink',
    solution: 'border-neon-pink/30 bg-neon-pink/5',
  },
  indigo: {
    icon: 'bg-accent-indigo/10 text-accent-indigo',
    solution: 'border-accent-indigo/30 bg-accent-indigo/5',
  },
  green: {
    icon: 'bg-neon-green/10 text-neon-green',
    solution: 'border-neon-green/30 bg-neon-green/5',
  },
};

export function UseCaseCard({
  title,
  problem,
  solution,
  icon,
  color = 'purple',
  className,
}: UseCaseCardProps) {
  const colors = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border border-border bg-bg-secondary/50 p-6 md:p-8',
        className
      )}
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            colors.icon
          )}
        >
          {icon}
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
      </div>

      {/* Problem → Solution grid */}
      <div className="grid gap-6 md:grid-cols-[1fr,auto,1fr]">
        {/* Problem */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-red-400">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">{problem.title}</span>
          </div>
          <ul className="space-y-2">
            {problem.points.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Arrow */}
        <div className="hidden items-center justify-center md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Solution */}
        <div className={cn('rounded-xl border p-4', colors.solution)}>
          <div className="mb-3 flex items-center gap-2 text-neon-green">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{solution.title}</span>
          </div>
          <ul className="space-y-2">
            {solution.points.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-green" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default UseCaseCard;
