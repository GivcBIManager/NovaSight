/**
 * Pipeline Wizard - Step 1: Source Configuration
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Database, Table, Code, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDataSources, useDataSourceSchema } from '@/features/datasources/hooks'
import { dataSourceService } from '@/services/dataSourceService'
import type { SourceType, WizardState, ColumnConfig } from '@/types/pipeline'

interface SourceSelectorProps {
  state: WizardState
  onStateChange: (updates: Partial<WizardState>) => void
}

export function SourceSelector({ state, onStateChange }: SourceSelectorProps) {
  const [selectedSchema, setSelectedSchema] = useState(state.sourceSchema || '')
  
  // Fetch available connections
  const { data: connectionsData, isLoading: loadingConnections } = useDataSources()
  
  // Fetch schema when connection is selected
  const { data: schemaData, isLoading: loadingSchema } = useDataSourceSchema(
    state.connectionId,
    { include_columns: false }
  )
  
  // Fetch columns for selected schema
  const shouldFetchTableSchema = !!state.connectionId && !!selectedSchema
  const { data: tableSchemaData, isLoading: loadingTableSchema } = useQuery({
    queryKey: ['datasources', 'schema', state.connectionId, selectedSchema, 'columns'],
    queryFn: () => dataSourceService.getSchema(state.connectionId, { 
      schema_name: selectedSchema,
      include_columns: true 
    }),
    enabled: shouldFetchTableSchema,
    staleTime: 60000,
  })

  const schemas = schemaData?.schemas || []
  const tables = tableSchemaData?.schemas?.[0]?.tables || []

  // Handle connection change
  const handleConnectionChange = (connectionId: string) => {
    onStateChange({
      connectionId,
      sourceSchema: undefined,
      sourceTable: undefined,
      columnsConfig: [],
    })
    setSelectedSchema('')
  }

  // Handle schema change
  const handleSchemaChange = (schema: string) => {
    setSelectedSchema(schema)
    onStateChange({
      sourceSchema: schema,
      sourceTable: undefined,
      columnsConfig: [],
    })
  }

  // Handle table selection
  const handleTableChange = (tableName: string) => {
    const selectedTable = tables.find(t => t.name === tableName)
    if (selectedTable) {
      const columns: ColumnConfig[] = (selectedTable.columns || []).map(col => ({
        name: col.name,
        data_type: col.type || 'VARCHAR',
        include: true,
        nullable: col.nullable ?? true,
      }))
      
      onStateChange({
        sourceTable: tableName,
        columnsConfig: columns,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Select Data Source</h3>
        <p className="text-sm text-muted-foreground">
          Choose a connection and specify the source table or query for your pipeline.
        </p>
      </div>

      {/* Connection Selection */}
      <div className="space-y-2">
        <Label>Connection</Label>
        {loadingConnections ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading connections...</span>
          </div>
        ) : (
          <Select
            value={state.connectionId}
            onValueChange={handleConnectionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a connection" />
            </SelectTrigger>
            <SelectContent>
              {connectionsData?.items?.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>{conn.name}</span>
                    <span className="text-xs text-muted-foreground">({conn.database_type})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Source Type Selection */}
      {state.connectionId && (
        <div className="space-y-2">
          <Label>Source Type</Label>
          <RadioGroup
            value={state.sourceType}
            onValueChange={(value: SourceType) => onStateChange({ sourceType: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="table" id="source-table" />
              <Label htmlFor="source-table" className="flex items-center gap-2 cursor-pointer">
                <Table className="h-4 w-4" />
                Table
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="query" id="source-query" />
              <Label htmlFor="source-query" className="flex items-center gap-2 cursor-pointer">
                <Code className="h-4 w-4" />
                Custom Query
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Schema & Table Selection */}
      {state.connectionId && state.sourceType === 'table' && (
        <>
          <div className="space-y-2">
            <Label>Schema</Label>
            {loadingSchema ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading schemas...</span>
              </div>
            ) : (
              <Select
                value={selectedSchema}
                onValueChange={handleSchemaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((schema) => (
                    <SelectItem key={schema.name} value={schema.name}>
                      {schema.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSchema && (
            <div className="space-y-2">
              <Label>Table</Label>
              {loadingTableSchema ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading tables...</span>
                </div>
              ) : (
                <Select
                  value={state.sourceTable}
                  onValueChange={handleTableChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.name} value={table.name}>
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          <span>{table.name}</span>
                          {table.row_count && (
                            <span className="text-xs text-muted-foreground">
                              (~{table.row_count.toLocaleString()} rows)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </>
      )}

      {/* Custom Query Input */}
      {state.connectionId && state.sourceType === 'query' && (
        <div className="space-y-2">
          <Label>SQL Query</Label>
          <Textarea
            value={state.sourceQuery || ''}
            onChange={(e) => onStateChange({ sourceQuery: e.target.value })}
            placeholder="SELECT column1, column2 FROM table WHERE ..."
            className="font-mono min-h-[200px]"
          />
          <Alert>
            <AlertDescription>
              The query will be executed to extract data. Use filtering to limit the data volume.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
