/**
 * useMediaQuery Hook
 * 
 * React hook for responsive design with media query matching.
 * Supports SSR and handles hydration correctly.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook that tracks whether a media query matches
 * 
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 * 
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with false for SSR
  const [matches, setMatches] = useState(false);

  const handleChange = useCallback((event: MediaQueryListEvent | MediaQueryList) => {
    setMatches(event.matches);
  }, []);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Legacy browsers (Safari < 14)
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query, handleChange]);

  return matches;
}

// Common media query presets
export const mediaQueries = {
  /** Mobile devices (< 640px) */
  sm: '(min-width: 640px)',
  /** Tablets (>= 768px) */
  md: '(min-width: 768px)',
  /** Laptops (>= 1024px) */
  lg: '(min-width: 1024px)',
  /** Desktops (>= 1280px) */
  xl: '(min-width: 1280px)',
  /** Large screens (>= 1536px) */
  '2xl': '(min-width: 1536px)',
  /** Prefers dark color scheme */
  dark: '(prefers-color-scheme: dark)',
  /** Prefers light color scheme */
  light: '(prefers-color-scheme: light)',
  /** Prefers reduced motion */
  reducedMotion: '(prefers-reduced-motion: reduce)',
  /** High contrast mode */
  highContrast: '(prefers-contrast: high)',
  /** Coarse pointer (touch devices) */
  touch: '(pointer: coarse)',
  /** Fine pointer (mouse) */
  mouse: '(pointer: fine)',
  /** Device in portrait orientation */
  portrait: '(orientation: portrait)',
  /** Device in landscape orientation */
  landscape: '(orientation: landscape)',
} as const;

/**
 * Helper hooks for common breakpoints
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(mediaQueries.md);
}

export function useIsTablet(): boolean {
  const isMd = useMediaQuery(mediaQueries.md);
  const isLg = useMediaQuery(mediaQueries.lg);
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useMediaQuery(mediaQueries.lg);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(mediaQueries.reducedMotion);
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery(mediaQueries.dark);
}

export function useIsTouchDevice(): boolean {
  return useMediaQuery(mediaQueries.touch);
}

export default useMediaQuery;
