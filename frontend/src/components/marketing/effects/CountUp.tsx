/**
 * CountUp Component
 * 
 * Animated counter that counts from 0 to target value on scroll.
 * Uses useInView trigger for scroll-based animation.
 */

import * as React from 'react';
import { useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CountUpProps {
  /** Target number to count to */
  target: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Prefix text (e.g., "$") */
  prefix?: string;
  /** Suffix text (e.g., "%", "+") */
  suffix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Trigger animation once */
  once?: boolean;
  /** Custom formatter */
  formatter?: (value: number) => string;
}

function defaultFormatter(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function CountUp({
  target,
  duration = 2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  once = true,
  formatter,
}: CountUpProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: '-50px' });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });

  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    if (isInView) {
      if (prefersReducedMotion) {
        setDisplayValue(target);
      } else {
        motionValue.set(target);
      }
    }
  }, [isInView, target, motionValue, prefersReducedMotion]);

  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return () => unsubscribe();
  }, [springValue, prefersReducedMotion]);

  const formattedValue = formatter
    ? formatter(displayValue)
    : defaultFormatter(displayValue, decimals);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

export default CountUp;
