/**
 * MarketingLayout Component
 * 
 * Layout wrapper for all marketing pages.
 * Includes navbar, footer, background effects, and page transitions.
 * Features skip-to-content link for accessibility.
 */

import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GridBackground } from '@/components/backgrounds';
import { MarketingNavbar } from './MarketingNavbar';
import { MarketingFooter } from './MarketingFooter';
import { GlowOrb } from '../effects/GlowOrb';
import { SkipToContent } from '../shared/SkipToContent';

export interface MarketingLayoutProps {
  /** Additional CSS classes */
  className?: string;
}

export function MarketingLayout({ className }: MarketingLayoutProps) {
  const prefersReducedMotion = useReducedMotion();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 10,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <div
      className={cn(
        'relative min-h-screen bg-bg-primary text-foreground',
        className
      )}
    >
      {/* Skip to content link for accessibility */}
      <SkipToContent />

      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <GridBackground
          gridOpacity={0.03}
          showOrbs={false}
          showGradient={false}
          fixed
        />

        {/* Floating glow orbs */}
        <GlowOrb
          color="purple"
          size="xl"
          position={{ top: '-10%', left: '-10%' }}
          intensity={0.12}
          animate
        />
        <GlowOrb
          color="cyan"
          size="lg"
          position={{ bottom: '10%', right: '-5%' }}
          intensity={0.1}
          animate
        />
        <GlowOrb
          color="pink"
          size="md"
          position={{ top: '50%', left: '60%' }}
          intensity={0.06}
          animate
        />
      </div>

      {/* Navigation */}
      <MarketingNavbar />

      {/* Main Content */}
      <motion.main
        id="main-content"
        className="relative outline-none"
        tabIndex={-1}
        initial={prefersReducedMotion ? undefined : 'initial'}
        animate={prefersReducedMotion ? undefined : 'animate'}
        exit={prefersReducedMotion ? undefined : 'exit'}
        variants={prefersReducedMotion ? undefined : pageVariants}
      >
        <Outlet />
      </motion.main>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}

export default MarketingLayout;
