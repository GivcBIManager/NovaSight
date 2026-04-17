/**
 * FreshnessIndicator — shows source freshness status as a badge.
 */

import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FreshnessIndicatorProps {
  sourceName: string
  lastLoadedAt?: string
  freshnessStatus: 'pass' | 'warn' | 'error' | 'unknown'
  threshold?: { warn: string; error: string }
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: 'text-green-600 border-green-400' },
  warn: { icon: AlertTriangle, color: 'text-amber-600 border-amber-400' },
  error: { icon: XCircle, color: 'text-red-600 border-red-400' },
  unknown: { icon: Clock, color: 'text-muted-foreground' },
} as const

function formatAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FreshnessIndicator({
  sourceName,
  lastLoadedAt,
  freshnessStatus,
  threshold,
}: FreshnessIndicatorProps) {
  const config = STATUS_CONFIG[freshnessStatus]
  const Icon = config.icon
  const age = lastLoadedAt ? formatAge(lastLoadedAt) : 'Unknown'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${config.color}`}>
            <Icon className="h-3 w-3" />
            {age}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Source: {sourceName}</p>
            <p>Last loaded: {lastLoadedAt ? new Date(lastLoadedAt).toLocaleString() : 'Never'}</p>
            {threshold && (
              <>
                <p>Warn after: {threshold.warn}</p>
                <p>Error after: {threshold.error}</p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
