/**
 * Chart Wrapper Component
 * Unified chart rendering with consistent styling and theming
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { CustomTooltip, PieTooltip } from './CustomTooltip'
import type { VizConfig, WidgetType } from '@/types/dashboard'

interface ChartWrapperProps {
  type: WidgetType
  data: any[]
  config: VizConfig
}

import { CHART_COLORS, CHART_AXIS } from '@/lib/colors'

const DEFAULT_COLORS = [...CHART_COLORS]

export function ChartWrapper({ type, data, config }: ChartWrapperProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }
  
  const colors = config.colors || DEFAULT_COLORS
  const showLegend = config.showLegend !== false
  const showGrid = config.showGrid !== false
  
  // Theme-aware axis styling from design tokens
  const mode = isDark ? 'dark' : 'light'
  const axisStyle = {
    stroke: CHART_AXIS[mode].axis,
    fontSize: 12,
    tickLine: { stroke: CHART_AXIS[mode].tick },
  }
  
  const gridStyle = {
    strokeDasharray: '3 3',
    stroke: CHART_AXIS[mode].grid,
  }
  
  const commonProps = {
    data,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  }
  
  const renderChart = () => {
    if (type === 'bar_chart') {
      return (
        <BarChart {...commonProps}>
          {showGrid && <CartesianGrid {...gridStyle} />}
          <XAxis dataKey={config.xAxis} {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {Array.isArray(config.yAxis) ? (
            config.yAxis.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[idx % colors.length]}
                stackId={config.stacked ? 'stack' : undefined}
                radius={[4, 4, 0, 0]}
              />
            ))
          ) : (
            <Bar
              dataKey={config.yAxis as string || 'value'}
              fill={colors[0]}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      )
    }
    
    if (type === 'line_chart') {
      return (
        <LineChart {...commonProps}>
          {showGrid && <CartesianGrid {...gridStyle} />}
          <XAxis dataKey={config.xAxis} {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {Array.isArray(config.yAxis) ? (
            config.yAxis.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            ))
          ) : (
            <Line
              type="monotone"
              dataKey={config.yAxis as string || 'value'}
              stroke={colors[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      )
    }
    
    if (type === 'area_chart') {
      return (
        <AreaChart {...commonProps}>
          {showGrid && <CartesianGrid {...gridStyle} />}
          <XAxis dataKey={config.xAxis} {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {Array.isArray(config.yAxis) ? (
            config.yAxis.map((key, idx) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={colors[idx % colors.length]}
                stroke={colors[idx % colors.length]}
                fillOpacity={0.3}
                stackId={config.stacked ? 'stack' : undefined}
              />
            ))
          ) : (
            <Area
              type="monotone"
              dataKey={config.yAxis as string || 'value'}
              fill={colors[0]}
              stroke={colors[0]}
              fillOpacity={0.3}
            />
          )}
        </AreaChart>
      )
    }
    
    if (type === 'pie_chart') {
      return (
        <PieChart>
          <Pie
            data={data}
            dataKey={config.yAxis as string}
            nameKey={config.xAxis}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          {showLegend && <Legend />}
        </PieChart>
      )
    }
    
    if (type === 'scatter_chart') {
      return (
        <ScatterChart {...commonProps}>
          {showGrid && <CartesianGrid {...gridStyle} />}
          <XAxis dataKey={config.xAxis} type="number" {...axisStyle} />
          <YAxis dataKey={config.yAxis as string} type="number" {...axisStyle} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Scatter data={data} fill={colors[0]} fillOpacity={0.7} />
        </ScatterChart>
      )
    }
    
    return null
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart() || <div>Unsupported chart type</div>}
    </ResponsiveContainer>
  )
}
