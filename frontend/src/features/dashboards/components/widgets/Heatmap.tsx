/**
 * Heatmap Component
 * Displays data intensity in a grid format with color gradients
 */

import { useMemo } from 'react'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface HeatmapProps {
  data: Array<{
    x: string | number
    y: string | number
    value: number
  }>
  config?: {
    xAxisLabel?: string
    yAxisLabel?: string
    colorScale?: 'blue' | 'green' | 'red' | 'purple' | 'orange'
    showValues?: boolean
    showLegend?: boolean
    minValue?: number
    maxValue?: number
  }
}

import { HEATMAP_SCALES } from '@/lib/colors'

// Color scales sourced from centralized design tokens
const COLOR_SCALES = HEATMAP_SCALES

export function Heatmap({ data, config = {} }: HeatmapProps) {
  const {
    xAxisLabel,
    yAxisLabel,
    colorScale = 'blue',
    showValues = true,
    showLegend = true,
  } = config

  // Calculate unique x and y values
  const { xValues, yValues, valueMap, minValue, maxValue } = useMemo(() => {
    const xSet = new Set<string>()
    const ySet = new Set<string>()
    const map = new Map<string, number>()
    let min = config.minValue ?? Infinity
    let max = config.maxValue ?? -Infinity

    data.forEach((item) => {
      const x = String(item.x)
      const y = String(item.y)
      xSet.add(x)
      ySet.add(y)
      map.set(`${x}-${y}`, item.value)
      
      if (config.minValue === undefined) min = Math.min(min, item.value)
      if (config.maxValue === undefined) max = Math.max(max, item.value)
    })

    return {
      xValues: Array.from(xSet),
      yValues: Array.from(ySet),
      valueMap: map,
      minValue: min === Infinity ? 0 : min,
      maxValue: max === -Infinity ? 100 : max,
    }
  }, [data, config.minValue, config.maxValue])

  // Get color based on value intensity
  const getColor = (value: number | undefined): string => {
    if (value === undefined) return 'transparent'
    
    const isDark = document.documentElement.classList.contains('dark')
    const colors = COLOR_SCALES[colorScale][isDark ? 'dark' : 'light']
    
    const normalized = (value - minValue) / (maxValue - minValue || 1)
    const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1)
    
    return colors[Math.max(0, index)]
  }

  // Get text color based on background intensity
  const getTextColor = (value: number | undefined): string => {
    if (value === undefined) return 'inherit'
    
    const normalized = (value - minValue) / (maxValue - minValue || 1)
    return normalized > 0.5 ? '#FFFFFF' : '#1F2937'
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full p-2 overflow-auto">
      {/* Y-axis label */}
      {yAxisLabel && (
        <div className="flex items-center mb-2">
          <span className="text-xs text-muted-foreground font-medium -rotate-90 origin-center">
            {yAxisLabel}
          </span>
        </div>
      )}

      {/* Main grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* X-axis headers */}
        <div
          className="grid gap-1 mb-1"
          style={{
            gridTemplateColumns: `auto repeat(${xValues.length}, minmax(40px, 1fr))`,
          }}
        >
          <div /> {/* Empty corner cell */}
          {xValues.map((x) => (
            <div
              key={x}
              className="text-xs text-muted-foreground text-center truncate px-1"
              title={x}
            >
              {x}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {yValues.map((y) => (
          <div
            key={y}
            className="grid gap-1 mb-1"
            style={{
              gridTemplateColumns: `auto repeat(${xValues.length}, minmax(40px, 1fr))`,
            }}
          >
            {/* Y-axis label */}
            <div
              className="text-xs text-muted-foreground pr-2 flex items-center justify-end truncate"
              title={y}
            >
              {y}
            </div>

            {/* Cells */}
            {xValues.map((x) => {
              const value = valueMap.get(`${x}-${y}`)
              const bgColor = getColor(value)
              const textColor = getTextColor(value)

              return (
                <div
                  key={`${x}-${y}`}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-sm transition-colors cursor-default',
                    value === undefined && 'bg-muted/30'
                  )}
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                  title={`${x}, ${y}: ${value !== undefined ? formatNumber(value) : 'N/A'}`}
                >
                  {showValues && value !== undefined && (
                    <span className="text-xs font-medium">
                      {formatNumber(value)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* X-axis label */}
        {xAxisLabel && (
          <div className="text-center mt-2">
            <span className="text-xs text-muted-foreground font-medium">
              {xAxisLabel}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {formatNumber(minValue)}
          </span>
          <div className="flex h-3 w-32 rounded overflow-hidden">
            {COLOR_SCALES[colorScale][
              document.documentElement.classList.contains('dark') ? 'dark' : 'light'
            ].map((color, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatNumber(maxValue)}
          </span>
        </div>
      )}
    </div>
  )
}
