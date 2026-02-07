/**
 * SectionHeader Component
 * 
 * Standardized section header with badge, title with highlight, and subtitle.
 * Animated on scroll using framer-motion.
 */

import * as React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  /** Optional badge text */
  badge?: string;
  /** Optional icon for badge */
  badgeIcon?: React.ReactNode;
  /** Main title text */
  title: string;
  /** Portion of title to highlight with gradient */
  titleHighlight?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Text alignment */
  align?: 'left' | 'center';
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

export function SectionHeader({
  badge,
  badgeIcon,
  title,
  titleHighlight,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) {
  // Split title around highlight portion
  const renderTitle = () => {
    if (!titleHighlight) {
      return title;
    }

    const parts = title.split(titleHighlight);
    if (parts.length === 1) {
      return title;
    }

    return (
      <>
        {parts[0]}
        <span className="bg-gradient-primary bg-clip-text text-transparent">
          {titleHighlight}
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <motion.div
      className={cn(
        'mx-auto max-w-3xl',
        align === 'center' ? 'text-center' : 'text-left',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {badge && (
        <motion.div
          className={cn(
            'mb-4 inline-flex items-center gap-2',
            'rounded-full border border-accent-purple/30 bg-accent-purple/10 px-4 py-1.5',
            'text-sm font-medium text-accent-purple'
          )}
          variants={itemVariants}
        >
          {badgeIcon && <span className="text-accent-purple">{badgeIcon}</span>}
          {badge}
        </motion.div>
      )}

      <motion.h2
        className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        variants={itemVariants}
      >
        {renderTitle()}
      </motion.h2>

      {subtitle && (
        <motion.p
          className="mt-4 text-lg text-muted-foreground sm:text-xl"
          variants={itemVariants}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

export default SectionHeader;
