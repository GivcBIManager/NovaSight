/**
 * ValuesGrid Component
 * 
 * Grid of core company values with icons and descriptions.
 */

import * as React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TiltCard } from '@/components/marketing/effects';
import { IconBadge } from '@/components/marketing/shared';

type ColorVariant = 'purple' | 'cyan' | 'pink' | 'indigo' | 'green';

export interface CoreValue {
  /** Value icon */
  icon: React.ReactNode;
  /** Value title */
  title: string;
  /** Value description */
  description: string;
  /** Color variant */
  color: ColorVariant;
}

export interface ValuesGridProps {
  /** Array of core values */
  values: CoreValue[];
  /** Additional CSS classes */
  className?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function ValuesGrid({ values, className }: ValuesGridProps) {
  return (
    <motion.div
      className={cn('grid gap-6 md:grid-cols-2 lg:grid-cols-3', className)}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {values.map((value, index) => (
        <motion.div key={value.title} variants={itemVariants}>
          <TiltCard
            maxTilt={8}
            glare
            glareOpacity={0.1}
            className="h-full"
          >
            <div className="flex h-full flex-col rounded-xl border border-border bg-bg-secondary/50 p-6">
              <IconBadge
                icon={value.icon}
                color={value.color}
                size="lg"
                glow
              />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {value.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          </TiltCard>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default ValuesGrid;
