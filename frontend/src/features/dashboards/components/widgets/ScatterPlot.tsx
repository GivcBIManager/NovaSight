/**
 * Scatter Plot Component
 * Interactive scatter chart for correlation analysis
 */

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { ScatterTooltip } from './CustomTooltip'

import { CHART_COLORS, CHART_AXIS } from '@/lib/colors'

const DEFAULT_COLORS = [...CHART_COLORS]

interface ScatterPlotProps {
  data: Array<Record<string, unknown>>
  config: {
    xAxisKey: string
    yAxisKey: string
    zAxisKey?: string // For bubble size
    groupKey?: string // For coloring by category
    xAxisLabel?: string
    yAxisLabel?: string
    colors?: string[]
    showLegend?: boolean
    showGrid?: boolean
    dotSize?: number | [number, number] // Single size or [min, max] for bubble
  }
}

export function ScatterPlot({ data, config }: ScatterPlotProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  const colors = config.colors || DEFAULT_COLORS
  const dotSize = config.dotSize || 60
  
  const mode = isDark ? 'dark' : 'light'
  const axisStyle = {
    stroke: CHART_AXIS[mode].axis,
    fontSize: 12,
    tickLine: { stroke: CHART_AXIS[mode].tick },
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  // Group data by category if groupKey is provided
  const groupedData = config.groupKey
    ? data.reduce<Record<string, Array<Record<string, unknown>>>>((acc, item) => {
        const group = String(item[config.groupKey!] ?? 'Other')
        if (!acc[group]) acc[group] = []
        acc[group].push(item)
        return acc
      }, {})
    : { default: data }

  const groups = Object.keys(groupedData)

  // Calculate z-axis range for bubble charts
  const zRange = Array.isArray(dotSize) ? dotSize : [dotSize, dotSize]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        {config.showGrid !== false && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_AXIS[mode].grid}
          />
        )}
        
        <XAxis
          type="number"
          dataKey={config.xAxisKey}
          name={config.xAxisLabel || config.xAxisKey}
          {...axisStyle}
          label={
            config.xAxisLabel
              ? {
                  value: config.xAxisLabel,
                  position: 'bottom',
                  offset: 0,
                  fill: CHART_AXIS[mode].label,
                }
              : undefined
          }
        />
        
        <YAxis
          type="number"
          dataKey={config.yAxisKey}
          name={config.yAxisLabel || config.yAxisKey}
          {...axisStyle}
          label={
            config.yAxisLabel
              ? {
                  value: config.yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  fill: CHART_AXIS[mode].label,
                }
              : undefined
          }
        />
        
        {config.zAxisKey && (
          <ZAxis
            type="number"
            dataKey={config.zAxisKey}
            range={zRange}
            name={config.zAxisKey}
          />
        )}
        
        <Tooltip
          content={
            <ScatterTooltip
              xLabel={config.xAxisLabel || config.xAxisKey}
              yLabel={config.yAxisLabel || config.yAxisKey}
            />
          }
          cursor={{ strokeDasharray: '3 3' }}
        />
        
        {config.showLegend !== false && groups.length > 1 && <Legend />}
        
        {groups.map((group, groupIndex) => (
          <Scatter
            key={group}
            name={group === 'default' ? 'Data' : group}
            data={groupedData[group]}
            fill={colors[groupIndex % colors.length]}
          >
            {groupedData[group].map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[groupIndex % colors.length]}
                fillOpacity={0.7}
              />
            ))}
          </Scatter>
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
