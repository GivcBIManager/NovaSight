/**
 * Query Result Component
 * Displays query results with chart/table views and SQL preview
 */

import { useState } from 'react'
import { BarChart3, Table2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartWrapper } from '@/features/dashboards/components/widgets/ChartWrapper'
import { DataTable } from '@/features/dashboards/components/widgets/DataTable'
import { CodeBlock } from './CodeBlock'
import { SaveToDashboardDialog } from './SaveToDashboardDialog'
import type { QueryResult as QueryResultType } from '../types'
import type { WidgetType, TableColumn } from '@/types/dashboard'

interface QueryResultProps {
  result: QueryResultType
}

export function QueryResult({ result }: QueryResultProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [showSQL, setShowSQL] = useState(false)

  const suggestedChartType = getSuggestedChartType(result.intent)
  const chartData = transformDataForChart(result.data)
  const tableColumns = getTableColumns(result.data.columns, result.intent)

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground">{result.explanation}</p>
              {result.intent.confidence < 0.8 && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Confidence: {Math.round(result.intent.confidence * 100)}% - 
                  Results may not match your intent exactly.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Results</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'chart' | 'table')}>
              <TabsList className="h-9">
                <TabsTrigger value="chart" className="px-3">
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  Chart
                </TabsTrigger>
                <TabsTrigger value="table" className="px-3">
                  <Table2 className="h-4 w-4 mr-1.5" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <SaveToDashboardDialog
              queryConfig={{
                dimensions: result.intent.dimensions,
                measures: result.intent.measures,
                filters: result.intent.filters,
              }}
              chartType={suggestedChartType}
            />
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'chart' ? (
            <div className="h-[400px]">
              <ChartWrapper
                type={suggestedChartType}
                data={chartData}
                config={{
                  xAxis: result.intent.dimensions[0],
                  yAxis: result.intent.measures,
                  showLegend: true,
                  showGrid: true,
                }}
              />
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <DataTable
                data={chartData}
                columns={tableColumns}
                pageSize={15}
                showPagination={chartData.length > 15}
              />
            </div>
          )}
          
          {/* Row count info */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {result.data.metadata?.row_count || result.data.rows.length} rows
            </span>
            {result.data.metadata?.execution_time && (
              <span>
                Query took {result.data.metadata.execution_time.toFixed(2)}s
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SQL Query (Collapsible) */}
      <div className="rounded-lg border">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          onClick={() => setShowSQL(!showSQL)}
        >
          <span className="text-sm font-medium">View generated SQL</span>
          {showSQL ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {showSQL && (
          <div className="px-4 pb-4">
            <CodeBlock code={result.sql} language="sql" />
          </div>
        )}
      </div>
    </div>
  )
}

function getSuggestedChartType(intent: QueryResultType['intent']): WidgetType {
  // Trend queries -> line chart
  if (intent.query_type === 'trend') {
    return 'line_chart'
  }
  
  // Comparison queries -> bar chart
  if (intent.query_type === 'comparison') {
    return 'bar_chart'
  }
  
  // Single dimension with single measure -> pie chart
  if (intent.dimensions.length === 1 && intent.measures.length === 1) {
    // But not if it's a time dimension
    const dim = intent.dimensions[0].toLowerCase()
    if (!dim.includes('date') && !dim.includes('time') && !dim.includes('month') && !dim.includes('year')) {
      return 'pie_chart'
    }
  }
  
  // Default to bar chart
  return 'bar_chart'
}

function transformDataForChart(data: QueryResultType['data']): any[] {
  return data.rows.map((row) => {
    const obj: Record<string, any> = {}
    data.columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

function getTableColumns(columns: string[], intent: QueryResultType['intent']): TableColumn[] {
  return columns.map((col) => {
    // Determine column type based on whether it's a measure or dimension
    const isMeasure = intent.measures.includes(col)
    
    return {
      field: col,
      label: formatColumnLabel(col),
      type: isMeasure ? 'number' : 'string',
    }
  })
}

function formatColumnLabel(column: string): string {
  return column
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
