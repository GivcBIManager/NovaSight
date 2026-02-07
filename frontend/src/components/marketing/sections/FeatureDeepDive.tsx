/**
 * FeatureDeepDive Component
 * 
 * Deep-dive section for a single feature category.
 * Includes icon, title, description, and tabbed content.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IconBadge } from '@/components/marketing/shared';
import { FeatureTabView, type FeatureTab } from './FeatureTabView';

type ColorVariant = 'purple' | 'cyan' | 'pink' | 'indigo' | 'green';

export interface FeatureDeepDiveProps {
  /** Section ID for scrollspy */
  id: string;
  /** Feature icon */
  icon: React.ReactNode;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Color variant */
  color?: ColorVariant;
  /** Tabs for feature details */
  tabs: FeatureTab[];
  /** Reverse layout (visual on left) */
  reverse?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const colorBorderStyles: Record<ColorVariant, string> = {
  purple: 'border-l-accent-purple',
  cyan: 'border-l-neon-cyan',
  pink: 'border-l-neon-pink',
  indigo: 'border-l-accent-indigo',
  green: 'border-l-neon-green',
};

export function FeatureDeepDive({
  id,
  icon,
  title,
  description,
  color = 'purple',
  tabs,
  reverse = false,
  className,
}: FeatureDeepDiveProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 border-l-4 py-16',
        colorBorderStyles[color],
        className
      )}
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className={cn(
            'grid gap-8 lg:gap-12',
            reverse ? 'lg:grid-cols-[1fr,auto]' : 'lg:grid-cols-[auto,1fr]'
          )}
        >
          {/* Header */}
          <div className={cn('space-y-4', reverse && 'lg:order-2')}>
            <div className="flex items-center gap-4">
              <IconBadge icon={icon} color={color} size="lg" glow />
              <h3 className="text-2xl font-bold text-foreground md:text-3xl">
                {title}
              </h3>
            </div>
            <p className="max-w-xl text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </motion.div>

        {/* Tabbed content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <FeatureTabView tabs={tabs} variant="pills" />
        </motion.div>
      </div>
    </section>
  );
}

export default FeatureDeepDive;
