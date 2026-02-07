/**
 * HeroBadge Component
 * 
 * Animated pill badge with shimmer effect for hero sections.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface HeroBadgeProps {
  /** Optional icon at the start */
  icon?: React.ReactNode;
  /** Badge text content */
  text: string;
  /** Optional link URL */
  href?: string;
  /** Enable shimmer animation */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function HeroBadge({
  icon,
  text,
  href,
  animate = true,
  className,
}: HeroBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const badgeContent = (
    <div
      className={cn(
        'relative inline-flex items-center gap-2 overflow-hidden',
        'rounded-full border border-accent-purple/30 bg-accent-purple/10',
        'px-4 py-1.5 text-sm font-medium',
        'transition-all duration-base',
        href && 'cursor-pointer hover:scale-[1.02] hover:border-accent-purple/50',
        className
      )}
    >
      {/* Shimmer effect overlay */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      {icon && (
        <span className="text-accent-purple" aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Text */}
      <span className="relative z-10 text-accent-purple">{text}</span>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="inline-block">
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
}

export default HeroBadge;
