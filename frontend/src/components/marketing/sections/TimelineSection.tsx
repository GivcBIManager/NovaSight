/**
 * TimelineSection Component
 * 
 * Horizontal timeline with milestone markers.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TimelineMilestone {
  /** Milestone date/label */
  date: string;
  /** Milestone title */
  title: string;
  /** Milestone description */
  description: string;
  /** Icon (optional) */
  icon?: React.ReactNode;
  /** Is this milestone completed? */
  completed?: boolean;
  /** Is this the current milestone? */
  current?: boolean;
}

export interface TimelineSectionProps {
  /** Array of milestones */
  milestones: TimelineMilestone[];
  /** Additional CSS classes */
  className?: string;
}

export function TimelineSection({ milestones, className }: TimelineSectionProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Desktop: Horizontal timeline */}
      <div className="hidden md:block">
        {/* Line */}
        <div className="absolute left-0 right-0 top-8 h-0.5 bg-border" />
        <motion.div
          className="absolute left-0 top-8 h-0.5 bg-gradient-primary"
          initial={{ width: 0 }}
          whileInView={{ width: `${((milestones.filter(m => m.completed || m.current).length - 0.5) / milestones.length) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
        />

        <div className="grid" style={{ gridTemplateColumns: `repeat(${milestones.length}, 1fr)` }}>
          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.date}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              {/* Marker */}
              <div
                className={cn(
                  'relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all',
                  milestone.current
                    ? 'border-accent-purple bg-accent-purple/20 shadow-glow-md'
                    : milestone.completed
                    ? 'border-neon-green bg-neon-green/20'
                    : 'border-border bg-bg-secondary'
                )}
              >
                {milestone.icon ? (
                  <span className={cn(
                    'h-6 w-6',
                    milestone.current ? 'text-accent-purple' : milestone.completed ? 'text-neon-green' : 'text-muted-foreground'
                  )}>
                    {milestone.icon}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full',
                      milestone.current
                        ? 'bg-accent-purple'
                        : milestone.completed
                        ? 'bg-neon-green'
                        : 'bg-muted-foreground'
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="mt-4 px-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    milestone.current ? 'text-accent-purple' : 'text-muted-foreground'
                  )}
                >
                  {milestone.date}
                </span>
                <h4 className="mt-1 font-semibold text-foreground">{milestone.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical timeline */}
      <div className="md:hidden">
        <div className="relative space-y-8 pl-8">
          {/* Vertical line */}
          <div className="absolute bottom-0 left-3 top-0 w-0.5 bg-border" />

          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.date}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Marker */}
              <div
                className={cn(
                  'absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full border-2',
                  milestone.current
                    ? 'border-accent-purple bg-accent-purple/20'
                    : milestone.completed
                    ? 'border-neon-green bg-neon-green/20'
                    : 'border-border bg-bg-secondary'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    milestone.current
                      ? 'bg-accent-purple'
                      : milestone.completed
                      ? 'bg-neon-green'
                      : 'bg-muted-foreground'
                  )}
                />
              </div>

              {/* Content */}
              <div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    milestone.current ? 'text-accent-purple' : 'text-muted-foreground'
                  )}
                >
                  {milestone.date}
                </span>
                <h4 className="mt-1 font-semibold text-foreground">{milestone.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimelineSection;
