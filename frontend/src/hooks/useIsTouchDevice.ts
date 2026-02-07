/**
 * useIsTouchDevice Hook
 * 
 * Detects if the current device is a touch device (no hover, coarse pointer).
 * Use this to disable hover-only effects on touch devices.
 * 
 * @example
 * ```tsx
 * const isTouchDevice = useIsTouchDevice();
 * 
 * // Disable tilt effect on touch
 * const tiltEnabled = !isTouchDevice;
 * ```
 */

import { useState, useEffect } from 'react';

const QUERY = '(hover: none) and (pointer: coarse)';

/**
 * Get initial state for SSR safety
 */
function getInitialState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(getInitialState);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    
    // Set initial value
    setIsTouchDevice(mediaQuery.matches);

    // Handler for changes
    const handler = (event: MediaQueryListEvent) => {
      setIsTouchDevice(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } 
    // Legacy browsers (Safari < 14)
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  return isTouchDevice;
}

export default useIsTouchDevice;
