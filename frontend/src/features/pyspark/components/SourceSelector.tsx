/**
 * Source Selector Component
 * 
 * Step 1 of the PySpark App Builder wizard.
 * Allows selecting a connection and specifying source table or query.
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Database, Table, Code, Loader2, CheckCircle, FileCode, ChevronDown } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDataSources, useDataSourceSchema } from '@/features/datasources/hooks'
import { dataSourceService } from '@/services/dataSourceService'
import { useSavedQueries } from '@/features/sql-editor/hooks/useSavedQueries'
import { useValidateQuery } from '../hooks'
import type { SourceType, PySparkWizardState, ColumnConfig } from '@/types/pyspark'
import type { DataSource, TableInfo } from '@/types/datasource'

interface SourceSelectorProps {
  state: PySparkWizardState
  onStateChange: (updates: Partial<PySparkWizardState>) => void
}

export function SourceSelector({ state, onStateChange }: SourceSelectorProps) {
  const [selectedSchema, setSelectedSchema] = useState(state.sourceSchema || '')
  
  // Fetch available connections
  const { data: connectionsData, isLoading: loadingConnections } = useDataSources()
  
  // Fetch saved queries with type 'pyspark'
  const { data: savedQueriesData } = useSavedQueries({ query_type: 'pyspark' })
  const savedQueries = savedQueriesData?.items || []
  
  // Fetch schema when connection is selected (without columns for speed)
  const { data: schemaData, isLoading: loadingSchema } = useDataSourceSchema(
    state.connectionId,
    { include_columns: false }
  )
  
  // Fetch columns for selected schema only (when schema is selected)
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
  
  // Query validation mutation
  const validateQuery = useValidateQuery()
  
  // Debug logging
  console.log('SourceSelector Debug:', {
    connectionId: state.connectionId,
    loadingSchema,
    schemaData,
    schemas: schemaData?.schemas,
    schemasLength: schemaData?.schemas?.length,
    selectedSchema,
    tableSchemaData,
    loadingTableSchema,
    shouldFetchTableSchema,
  })
  
  // Get available schemas from data
  const schemas = schemaData?.schemas || []
  const selectedSchemaData = schemas.find(s => s.name === selectedSchema)
  // Use table schema data (with columns) if available, otherwise fall back to basic schema
  const tableSchemaWithCols = tableSchemaData?.schemas?.find(s => s.name === selectedSchema)
  const tables = tableSchemaWithCols?.tables || selectedSchemaData?.tables || []
  
  // Debug tables
  console.log('Tables Debug:', {
    selectedSchemaData,
    tableSchemaWithCols,
    tables,
    firstTableColumns: tables[0]?.columns,
  })

  // Update columns when tableSchemaData loads and a table is selected
  useEffect(() => {
    if (state.sourceTable && tableSchemaWithCols && !loadingTableSchema) {
      const table = tableSchemaWithCols.tables.find(t => t.name === state.sourceTable)
      if (table?.columns && table.columns.length > 0) {
        const columns: ColumnConfig[] = table.columns.map(col => ({
          name: col.name,
          data_type: col.data_type,
          include: true,
          nullable: col.is_nullable ?? col.nullable ?? true,
          comment: col.comment,
        }))
        // Only update if columns changed
        if (state.availableColumns.length !== columns.length) {
          console.log('Updating columns from useEffect:', columns.length)
          onStateChange({
            availableColumns: columns,
            selectedColumns: columns,
          })
        }
      }
    }
  }, [tableSchemaWithCols, state.sourceTable, loadingTableSchema])
  
  // Handle connection change
  const handleConnectionChange = (connectionId: string) => {
    onStateChange({
      connectionId,
      sourceSchema: '',
      sourceTable: '',
      sourceQuery: '',
      availableColumns: [],
      selectedColumns: [],
    })
    setSelectedSchema('')
  }
  
  // Handle source type change
  const handleSourceTypeChange = (sourceType: SourceType) => {
    onStateChange({
      sourceType,
      sourceQuery: sourceType === 'query' ? state.sourceQuery : '',
    })
  }
  
  // Handle schema selection
  const handleSchemaChange = (schema: string) => {
    setSelectedSchema(schema)
    onStateChange({
      sourceSchema: schema,
      sourceTable: '',
      availableColumns: [],
      selectedColumns: [],
    })
  }
  
  // Handle table selection
  const handleTableChange = (tableName: string) => {
    const table = tables.find(t => t.name === tableName)
    const columns: ColumnConfig[] = (table?.columns || []).map(col => ({
      name: col.name,
      data_type: col.data_type,
      include: true,
      nullable: col.is_nullable,
      comment: col.comment,
    }))
    
    onStateChange({
      sourceTable: tableName,
      availableColumns: columns,
      selectedColumns: columns,
    })
  }
  
  // Handle query validation
  const handleValidateQuery = async () => {
    if (!state.connectionId || !state.sourceQuery) return
    
    validateQuery.mutate(
      { connection_id: state.connectionId, query: state.sourceQuery },
      {
        onSuccess: (result) => {
          if (result.valid && result.columns) {
            const columns: ColumnConfig[] = result.columns.map(col => ({
              name: col.name,
              data_type: col.data_type,
              include: true,
              nullable: col.nullable ?? true,
            }))
            onStateChange({
              availableColumns: columns,
              selectedColumns: columns,
            })
          }
        },
      }
    )
  }
  
  // Handle loading a saved query
  const handleLoadSavedQuery = (query: { id: string; name: string; sql: string; connection_id?: string }) => {
    // Set the connection if the saved query has one
    if (query.connection_id) {
      onStateChange({
        connectionId: query.connection_id,
        sourceType: 'query',
        sourceQuery: query.sql,
        availableColumns: [],
        selectedColumns: [],
      })
    } else {
      // Just update the query, keep current connection
      onStateChange({
        sourceType: 'query',
        sourceQuery: query.sql,
        availableColumns: [],
        selectedColumns: [],
      })
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Select Data Source</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a connection and specify the source table or SQL query.
        </p>
      </div>
      
      {/* Connection Selection */}
      <div className="space-y-2">
        <Label htmlFor="connection">Connection</Label>
        <Select
          value={state.connectionId}
          onValueChange={handleConnectionChange}
        >
          <SelectTrigger id="connection">
            <SelectValue placeholder="Select a connection" />
          </SelectTrigger>
          <SelectContent>
            {loadingConnections ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              connectionsData?.items?.map((conn: DataSource) => (
                <SelectItem key={conn.id} value={conn.id}>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>{conn.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({conn.db_type})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* Source Type Selection */}
      {state.connectionId && (
        <div className="space-y-3">
          <Label>Source Type</Label>
          <RadioGroup
            value={state.sourceType}
            onValueChange={(v: string) => handleSourceTypeChange(v as SourceType)}
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
                SQL Query
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
      
      {/* Table Selection */}
      {state.connectionId && state.sourceType === 'table' && (
        <div className="space-y-4">
          {loadingSchema ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading schema...
            </div>
          ) : (
            <>
              {/* Schema Selection */}
              <div className="space-y-2">
                <Label htmlFor="schema">Schema</Label>
                <Select
                  value={selectedSchema}
                  onValueChange={handleSchemaChange}
                >
                  <SelectTrigger id="schema">
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemas.filter(s => s.tables.length > 0).map((schema) => (
                      <SelectItem key={schema.name} value={schema.name}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Table Selection */}
              {selectedSchema && (
                <div className="space-y-2">
                  <Label htmlFor="table">Table</Label>
                  <Select
                    value={state.sourceTable}
                    onValueChange={handleTableChange}
                  >
                    <SelectTrigger id="table">
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table: TableInfo) => (
                        <SelectItem key={table.name} value={table.name}>
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            {table.name}
                            {table.row_count !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                (~{table.row_count.toLocaleString()} rows)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* SQL Query Input */}
      {state.connectionId && state.sourceType === 'query' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="query">SQL Query</Label>
              {savedQueries.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileCode className="h-4 w-4 mr-2" />
                      Load Saved Query
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {savedQueries.map((query) => (
                      <DropdownMenuItem
                        key={query.id}
                        onClick={() => handleLoadSavedQuery(query)}
                        className="flex flex-col items-start"
                      >
                        <span className="font-medium">{query.name}</span>
                        {query.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-full">
                            {query.description}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Textarea
              id="query"
              value={state.sourceQuery}
              onChange={(e) => onStateChange({ sourceQuery: e.target.value })}
              placeholder="SELECT column1, column2 FROM schema.table WHERE ..."
              className="font-mono text-sm min-h-[150px]"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleValidateQuery}
              disabled={!state.sourceQuery || validateQuery.isPending}
            >
              {validateQuery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Validate Query
            </Button>
            
            {validateQuery.data && (
              <span className={`text-sm ${validateQuery.data.valid ? 'text-green-600' : 'text-red-600'}`}>
                {validateQuery.data.message}
              </span>
            )}
          </div>
          
          {validateQuery.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to validate query. Please check your syntax.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      {/* Column Preview */}
      {state.availableColumns.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Found {state.availableColumns.length} columns. Proceed to the next step to select columns.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default SourceSelector
