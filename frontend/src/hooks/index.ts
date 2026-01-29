/**
 * Custom React hooks for NovaSight
 * 
 * This folder contains reusable custom hooks:
 * - Data fetching hooks (using React Query)
 * - Form handling hooks
 * - UI state hooks
 * - Authentication hooks
 * - Responsive design hooks
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
