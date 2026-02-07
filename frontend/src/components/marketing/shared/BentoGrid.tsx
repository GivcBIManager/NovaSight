/**
 * BentoGrid Component
 * 
 * Asymmetric grid layout for feature showcases.
 * Supports variable column and row spans.
 */

import * as React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BentoGridProps {
  /** Grid items */
  children: React.ReactNode;
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const columnClasses = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function BentoGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: BentoGridProps) {
  return (
    <motion.div
      className={cn(
        'grid auto-rows-[minmax(180px,auto)]',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {children}
    </motion.div>
  );
}

export interface BentoGridItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Column span */
  colSpan?: 1 | 2 | 3 | 4;
  /** Row span */
  rowSpan?: 1 | 2 | 3;
  /** Additional CSS classes */
  className?: string;
}

const colSpanClasses = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3 lg:col-span-3',
  4: 'md:col-span-2 lg:col-span-4',
};

const rowSpanClasses = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export function BentoGridItem({
  children,
  colSpan = 1,
  rowSpan = 1,
  className,
}: BentoGridItemProps) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-xl',
        'border border-border bg-bg-secondary',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}

export default BentoGrid;
