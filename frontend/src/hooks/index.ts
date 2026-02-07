/**
 * Custom React hooks for NovaSight
 * 
 * This folder contains reusable custom hooks:
 * - Data fetching hooks (using React Query)
 * - Form handling hooks
 * - UI state hooks
 * - Authentication hooks
 * - Responsive design hooks
 * - SEO hooks
 * - Accessibility hooks
 */

export { useAuth } from '@/contexts/AuthContext'
export { useToast } from '@/components/ui/use-toast'

// Responsive design hooks
export { 
  useMediaQuery, 
  useIsMobile, 
  useIsTablet, 
  useIsDesktop, 
  usePrefersReducedMotion, 
  usePrefersDarkMode, 
  useIsTouchDevice, 
  mediaQueries 
} from './useMediaQuery'

export { 
  useBreakpoint, 
  useResponsiveValue, 
  getResponsiveValue,
} from './useBreakpoint'

export type { Breakpoint } from './useBreakpoint'

// Contact form hook
export { useContactForm } from './useContactForm'

// SEO hook
export { useSEO, type SEOConfig } from './useSEO'

// Standalone accessibility/responsive hooks (alternative exports)
export { usePrefersReducedMotion as usePrefersReducedMotionStandalone } from './usePrefersReducedMotion'
export { useIsTouchDevice as useIsTouchDeviceStandalone } from './useIsTouchDevice'
