/**
 * useBreakpoint Hook
 * 
 * React hook for responsive design using Tailwind CSS breakpoints.
 * Returns the current breakpoint and provides comparison utilities.
 */

import { useState, useEffect, useMemo } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpointValues: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

interface BreakpointResult {
  /** Current breakpoint name */
  breakpoint: Breakpoint;
  /** Current window width */
  width: number;
  /** Check if current breakpoint is at least the given size */
  isAbove: (bp: Breakpoint) => boolean;
  /** Check if current breakpoint is at most the given size */
  isBelow: (bp: Breakpoint) => boolean;
  /** Check if current breakpoint matches exactly */
  isExactly: (bp: Breakpoint) => boolean;
  /** Check if current breakpoint is between two sizes (inclusive) */
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
}

/**
 * Hook that tracks the current Tailwind CSS breakpoint
 * 
 * @returns Object with current breakpoint and comparison utilities
 * 
 * @example
 * ```tsx
 * const { breakpoint, isAbove, isBelow } = useBreakpoint();
 * 
 * if (isAbove('md')) {
 *   // Desktop/tablet layout
 * }
 * 
 * if (isBelow('lg')) {
 *   // Mobile/tablet layout
 * }
 * ```
 */
export function useBreakpoint(): BreakpointResult {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // Use ResizeObserver for better performance if available
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(document.body);
      return () => observer.disconnect();
    }

    // Fallback to window resize event
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoint = useMemo((): Breakpoint => {
    if (width >= breakpointValues['2xl']) return '2xl';
    if (width >= breakpointValues.xl) return 'xl';
    if (width >= breakpointValues.lg) return 'lg';
    if (width >= breakpointValues.md) return 'md';
    if (width >= breakpointValues.sm) return 'sm';
    return 'xs';
  }, [width]);

  const isAbove = (bp: Breakpoint): boolean => {
    return width >= breakpointValues[bp];
  };

  const isBelow = (bp: Breakpoint): boolean => {
    return width < breakpointValues[bp];
  };

  const isExactly = (bp: Breakpoint): boolean => {
    return breakpoint === bp;
  };

  const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
    const minIndex = breakpointOrder.indexOf(min);
    const maxIndex = breakpointOrder.indexOf(max);
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    return currentIndex >= minIndex && currentIndex <= maxIndex;
  };

  return {
    breakpoint,
    width,
    isAbove,
    isBelow,
    isExactly,
    isBetween,
  };
}

/**
 * Get the value for the current breakpoint from a responsive object
 * 
 * @param values - Object mapping breakpoints to values
 * @param currentBreakpoint - Current breakpoint name
 * @returns The value for the current breakpoint (falls back to smaller breakpoints)
 * 
 * @example
 * ```tsx
 * const { breakpoint } = useBreakpoint();
 * const columns = getResponsiveValue(
 *   { xs: 1, sm: 2, md: 3, lg: 4 },
 *   breakpoint
 * ); // Returns appropriate column count
 * ```
 */
export function getResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint
): T | undefined {
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  // Find the value for current breakpoint or fall back to smaller ones
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

/**
 * Hook that returns a responsive value based on current breakpoint
 * 
 * @param values - Object mapping breakpoints to values
 * @returns The value for the current breakpoint
 */
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>
): T | undefined {
  const { breakpoint } = useBreakpoint();
  return useMemo(
    () => getResponsiveValue(values, breakpoint),
    [values, breakpoint]
  );
}

export default useBreakpoint;
