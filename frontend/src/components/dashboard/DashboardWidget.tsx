/**
 * DashboardWidget Component
 * 
 * Container for dashboard widgets with header, actions, and loading states.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  RefreshCw,
  Maximize2,
  Minimize2,
  Download,
  Settings,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardWidgetProps {
  /** Widget title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Widget content */
  children: React.ReactNode;
  /** Widget icon */
  icon?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Retry callback for errors */
  onRetry?: () => void;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Whether widget is refreshing */
  isRefreshing?: boolean;
  /** Download callback */
  onDownload?: () => void;
  /** Settings callback */
  onSettings?: () => void;
  /** Fullscreen mode */
  isFullscreen?: boolean;
  /** Toggle fullscreen callback */
  onToggleFullscreen?: () => void;
  /** Whether to show header actions */
  showActions?: boolean;
  /** Custom header actions */
  headerActions?: React.ReactNode;
  /** Variant style */
  variant?: 'default' | 'elevated' | 'ai';
  /** Additional CSS classes */
  className?: string;
  /** Content padding */
  contentPadding?: 'none' | 'sm' | 'md' | 'lg';
}

const contentPaddingClasses = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

function WidgetSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-4 w-1/4 rounded bg-bg-tertiary" />
        <div className="h-4 w-1/3 rounded bg-bg-tertiary" />
      </div>
      <div className="h-32 rounded-lg bg-bg-tertiary" />
      <div className="flex gap-4">
        <div className="h-4 w-1/2 rounded bg-bg-tertiary" />
        <div className="h-4 w-1/4 rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

function WidgetError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
      <p className="text-sm text-muted-foreground">{error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export function DashboardWidget({
  title,
  subtitle,
  children,
  icon,
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
  isRefreshing = false,
  onDownload,
  onSettings,
  isFullscreen = false,
  onToggleFullscreen,
  showActions = true,
  headerActions,
  variant = 'default',
  className,
  contentPadding = 'md',
}: DashboardWidgetProps) {
  const hasMenuActions = onDownload || onSettings;

  return (
    <GlassCard
      variant={variant}
      className={cn(
        'flex flex-col overflow-hidden',
        isFullscreen && 'fixed inset-4 z-50',
        className
      )}
      animated={false}
    >
      {/* Header */}
      <GlassCardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo/20 text-accent-indigo">
                {icon}
              </div>
            )}
            <div>
              <GlassCardTitle className="text-base">{title}</GlassCardTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1">
              {headerActions}

              {/* Refresh button */}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      isRefreshing && 'animate-spin'
                    )}
                  />
                </Button>
              )}

              {/* Fullscreen toggle */}
              {onToggleFullscreen && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* More actions menu */}
              {hasMenuActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onDownload && (
                      <DropdownMenuItem onClick={onDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    )}
                    {onSettings && (
                      <>
                        {onDownload && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={onSettings}>
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </GlassCardHeader>

      {/* Content */}
      <GlassCardContent
        className={cn('flex-1 overflow-auto', contentPaddingClasses[contentPadding])}
      >
        {isLoading ? (
          <WidgetSkeleton />
        ) : error ? (
          <WidgetError error={error} onRetry={onRetry} />
        ) : (
          children
        )}
      </GlassCardContent>

      {/* Loading overlay for refresh */}
      {isRefreshing && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-bg-primary/50 backdrop-blur-sm"
        >
          <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
        </motion.div>
      )}
    </GlassCard>
  );
}

// Common widget configurations
export const widgetPresets = {
  chart: {
    contentPadding: 'sm' as const,
    showActions: true,
  },
  table: {
    contentPadding: 'none' as const,
    showActions: true,
  },
  metric: {
    contentPadding: 'md' as const,
    showActions: false,
  },
  ai: {
    variant: 'ai' as const,
    contentPadding: 'md' as const,
    showActions: true,
  },
};

export default DashboardWidget;
