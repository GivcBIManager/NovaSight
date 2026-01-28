/**
 * Custom Tooltip Component for Recharts
 * Provides styled tooltips with smart value formatting
 */

import { Card } from '@/components/ui/card'
import { formatByKeyName, formatNumber } from '@/lib/formatters'

export interface TooltipPayloadItem {
  name: string
  value: number
  color: string
  dataKey: string
  payload?: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  labelFormatter?: (label: string) => string
  valueFormatter?: (value: number, dataKey: string) => string
}

export function CustomTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const formattedLabel = labelFormatter ? labelFormatter(label || '') : label

  return (
    <Card className="p-3 shadow-lg border bg-popover text-popover-foreground z-50">
      {formattedLabel && (
        <p className="font-medium text-sm mb-2 pb-2 border-b">{formattedLabel}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium ml-auto">
              {valueFormatter
                ? valueFormatter(item.value, item.dataKey)
                : formatSmartValue(item.value, item.dataKey)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Smart value formatting based on dataKey hints
function formatSmartValue(value: number, dataKey: string): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return String(value ?? '-')
  }
  
  return formatByKeyName(value, dataKey)
}

// Simple tooltip for pie charts that shows name and percentage
interface PieTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload?: {
      name?: string
      percent?: number
    }
  }>
}

export function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const data = payload[0]
  const percent = data.payload?.percent
    ? (data.payload.percent * 100).toFixed(1)
    : null

  return (
    <Card className="p-3 shadow-lg border bg-popover text-popover-foreground z-50">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">{data.name}</span>
        <span className="text-muted-foreground text-sm">
          {formatNumber(data.value)}
          {percent && ` (${percent}%)`}
        </span>
      </div>
    </Card>
  )
}

// Tooltip for scatter charts showing x and y values
interface ScatterTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    dataKey: string
    name: string
  }>
  xLabel?: string
  yLabel?: string
}

export function ScatterTooltip({
  active,
  payload,
  xLabel = 'X',
  yLabel = 'Y',
}: ScatterTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const xValue = payload.find((p) => p.dataKey === 'x')?.value ?? payload[0]?.value
  const yValue = payload.find((p) => p.dataKey === 'y')?.value ?? payload[1]?.value

  return (
    <Card className="p-3 shadow-lg border bg-popover text-popover-foreground z-50">
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{xLabel}:</span>
          <span className="font-medium">{formatNumber(xValue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{yLabel}:</span>
          <span className="font-medium">{formatNumber(yValue)}</span>
        </div>
      </div>
    </Card>
  )
}
