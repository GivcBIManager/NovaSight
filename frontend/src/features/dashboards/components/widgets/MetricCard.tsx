/**
 * Metric Card Widget
 * Displays KPI values with optional comparison to previous period
 */

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters'
import type { VizConfig } from '@/types/dashboard'

interface MetricCardProps {
  data: any[]
  config: VizConfig & {
    format?: 'number' | 'currency' | 'percent'
    showChange?: boolean
    changeFormat?: 'percent' | 'absolute'
    positiveIsGood?: boolean
  }
}

export function MetricCard({ data, config }: MetricCardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data
      </div>
    )
  }

  const value = data[0]?.[config.metric || 'value'] || 0
  const previousValue = data[0]?.previous_value
  const comparison = config.comparison
  const showChange = config.showChange !== false && comparison

  let changePercent = 0
  let changeDirection: 'up' | 'down' | 'neutral' = 'neutral'

  if (previousValue !== undefined && previousValue !== 0) {
    changePercent = ((value - previousValue) / Math.abs(previousValue)) * 100
    changeDirection = changePercent > 0.1 ? 'up' : changePercent < -0.1 ? 'down' : 'neutral'
  }

  const isPositive = changeDirection === 'up'
  const positiveIsGood = config.positiveIsGood !== false
  const isGood = positiveIsGood ? isPositive : !isPositive

  // Format the main value based on config
  const formattedValue = formatMetricValue(value, config.format)

  return (
    <div className="flex flex-col justify-center items-center h-full p-4">
      <div className="text-4xl font-bold text-foreground mb-2">
        {formattedValue}
      </div>

      {showChange && changeDirection !== 'neutral' && (
        <div
          className={`flex items-center gap-1 text-sm ${
            isGood ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
          }`}
        >
          {changeDirection === 'up' && <ArrowUp className="h-4 w-4" />}
          {changeDirection === 'down' && <ArrowDown className="h-4 w-4" />}
          <span>
            {config.changeFormat === 'absolute'
              ? formatNumber(Math.abs(value - previousValue))
              : formatPercent(Math.abs(changePercent) / 100)}
          </span>
          <span className="text-muted-foreground ml-1">
            vs {comparison?.type?.replace('_', ' ') || 'previous'}
          </span>
        </div>
      )}

      {showChange && changeDirection === 'neutral' && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Minus className="h-4 w-4" />
          <span>No change</span>
        </div>
      )}
    </div>
  )
}

function formatMetricValue(value: number, format?: string): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    default:
      return formatNumber(value)
  }
}
