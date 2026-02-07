/**
 * IndustrySection Component
 * 
 * Expandable industry solution cards with key stats and benefits.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

type ColorVariant = 'indigo' | 'green' | 'pink' | 'cyan' | 'purple';

export interface IndustrySolution {
  /** Unique identifier */
  id: string;
  /** Industry icon */
  icon: React.ReactNode;
  /** Industry name */
  title: string;
  /** Key metric/stat */
  stat: string;
  /** Stat description */
  statLabel: string;
  /** Short description */
  description: string;
  /** Benefits list */
  benefits: string[];
  /** Color variant */
  color: ColorVariant;
}

export interface IndustrySectionProps {
  /** Array of industry solutions */
  industries: IndustrySolution[];
  /** Additional CSS classes */
  className?: string;
}

const colorStyles: Record<ColorVariant, { bg: string; border: string; accent: string; glow: string }> = {
  indigo: {
    bg: 'bg-accent-indigo/10',
    border: 'border-accent-indigo/30',
    accent: 'text-accent-indigo',
    glow: 'shadow-[0_0_40px_hsl(var(--color-accent-indigo)/0.15)]',
  },
  green: {
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/30',
    accent: 'text-neon-green',
    glow: 'shadow-[0_0_40px_hsl(var(--color-neon-green)/0.15)]',
  },
  pink: {
    bg: 'bg-neon-pink/10',
    border: 'border-neon-pink/30',
    accent: 'text-neon-pink',
    glow: 'shadow-[0_0_40px_hsl(var(--color-neon-pink)/0.15)]',
  },
  cyan: {
    bg: 'bg-neon-cyan/10',
    border: 'border-neon-cyan/30',
    accent: 'text-neon-cyan',
    glow: 'shadow-[0_0_40px_hsl(var(--color-neon-cyan)/0.15)]',
  },
  purple: {
    bg: 'bg-accent-purple/10',
    border: 'border-accent-purple/30',
    accent: 'text-accent-purple',
    glow: 'shadow-[0_0_40px_hsl(var(--color-accent-purple)/0.15)]',
  },
};

function IndustryCard({ industry }: { industry: IndustrySolution }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const colors = colorStyles[industry.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl border transition-all duration-300',
        colors.border,
        isExpanded && colors.glow
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-4 p-6 text-left"
        aria-expanded={isExpanded}
        aria-controls={`industry-content-${industry.id}`}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
            colors.bg,
            colors.accent
          )}
        >
          {industry.icon}
        </div>

        {/* Title and stat */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">{industry.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', colors.accent)}>
              {industry.stat}
            </span>
            <span className="text-sm text-muted-foreground">
              {industry.statLabel}
            </span>
          </div>
        </div>

        {/* Expand button */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id={`industry-content-${industry.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={cn('border-t px-6 pb-6 pt-4', colors.border)}>
              <p className="mb-4 text-muted-foreground">{industry.description}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {industry.benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', colors.accent)} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function IndustrySection({ industries, className }: IndustrySectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {industries.map((industry) => (
        <IndustryCard key={industry.id} industry={industry} />
      ))}
    </div>
  );
}

export default IndustrySection;
