/**
 * TestCoverageBadge — shows test count and pass/fail ratio for a model.
 */

import { FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TestCoverageBadgeProps {
  testCount: number
  passedCount: number
  failedCount: number
  lastRunAt?: string
}

export function TestCoverageBadge({
  testCount,
  passedCount,
  failedCount,
  lastRunAt,
}: TestCoverageBadgeProps) {
  const hasFailures = failedCount > 0
  const coveragePercent = testCount > 0 ? Math.round((passedCount / testCount) * 100) : 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 ${
              hasFailures
                ? 'border-red-400 text-red-600'
                : testCount > 0
                ? 'border-green-400 text-green-600'
                : 'border-muted-foreground text-muted-foreground'
            }`}
          >
            {hasFailures ? (
              <AlertCircle className="h-3 w-3" />
            ) : testCount > 0 ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <FlaskConical className="h-3 w-3" />
            )}
            {testCount > 0 ? `${passedCount}/${testCount}` : 'No tests'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Test Coverage: {coveragePercent}%</p>
            <p>• {passedCount} passed</p>
            {failedCount > 0 && <p className="text-red-400">• {failedCount} failed</p>}
            {lastRunAt && (
              <p className="text-muted-foreground">Last run: {new Date(lastRunAt).toLocaleString()}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
