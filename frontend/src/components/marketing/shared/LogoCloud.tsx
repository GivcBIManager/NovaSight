/**
 * LogoCloud Component
 * 
 * Display logos in a static grid or infinite scroll marquee.
 * Grayscale to color on hover.
 */

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Logo {
  /** Unique identifier */
  id: string;
  /** Logo name (for alt text) */
  name: string;
  /** Logo source URL or component */
  src?: string;
  /** Custom logo component */
  component?: React.ReactNode;
}

export interface LogoCloudProps {
  /** Array of logos to display */
  logos: Logo[];
  /** Display mode */
  variant?: 'grid' | 'marquee';
  /** Marquee animation speed (pixels per second) */
  marqueeSpeed?: number;
  /** Pause marquee on hover */
  pauseOnHover?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function LogoItem({ logo }: { logo: Logo }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center px-6 py-4',
        'grayscale opacity-60 transition-all duration-base',
        'hover:grayscale-0 hover:opacity-100'
      )}
    >
      {logo.component ? (
        logo.component
      ) : (
        <img
          src={logo.src}
          alt={logo.name}
          className="h-8 w-auto object-contain sm:h-10"
          loading="lazy"
        />
      )}
    </div>
  );
}

function MarqueeTrack({ logos, reverse }: { logos: Logo[]; reverse?: boolean }) {
  return (
    <motion.div
      className="flex shrink-0"
      animate={{ x: reverse ? '0%' : '-50%' }}
      initial={{ x: reverse ? '-50%' : '0%' }}
      transition={{
        duration: 30,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {/* Duplicate logos for seamless loop */}
      {[...logos, ...logos].map((logo, index) => (
        <LogoItem key={`${logo.id}-${index}`} logo={logo} />
      ))}
    </motion.div>
  );
}

export function LogoCloud({
  logos,
  variant = 'grid',
  marqueeSpeed = 30,
  pauseOnHover = true,
  className,
}: LogoCloudProps) {
  const prefersReducedMotion = useReducedMotion();

  if (variant === 'grid' || prefersReducedMotion) {
    return (
      <div
        className={cn(
          'grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
          className
        )}
      >
        {logos.map((logo) => (
          <LogoItem key={logo.id} logo={logo} />
        ))}
      </div>
    );
  }

  // Marquee variant
  return (
    <div
      className={cn(
        'relative flex overflow-hidden',
        pauseOnHover && '[&:hover_>_div]:animation-play-state-paused',
        className
      )}
      aria-hidden="true"
    >
      {/* Gradient masks */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-bg-primary to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-bg-primary to-transparent" />

      <MarqueeTrack logos={logos} />
    </div>
  );
}

export default LogoCloud;
