/**
 * ImpactBadge — shows downstream impact warning when editing a model.
 */

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useImpactAnalysis } from '../../hooks/useModelLineage'

interface ImpactBadgeProps {
  modelName: string
}

export function ImpactBadge({ modelName }: ImpactBadgeProps) {
  const { data: impact } = useImpactAnalysis(modelName)
  
  if (!impact || impact.affected_models === 0) {
    return null
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-amber-400 text-amber-600 dark:text-amber-400 gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            {impact.affected_models} downstream
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Impact Analysis</p>
          <ul className="text-xs space-y-0.5">
            <li>• {impact.affected_models} model(s) depend on this</li>
            {impact.affected_tests > 0 && (
              <li>• {impact.affected_tests} test(s) may be affected</li>
            )}
            {impact.affected_exposures > 0 && (
              <li>• {impact.affected_exposures} exposure(s) reference this</li>
            )}
          </ul>
          {impact.model_names.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              e.g. {impact.model_names.slice(0, 3).join(', ')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
