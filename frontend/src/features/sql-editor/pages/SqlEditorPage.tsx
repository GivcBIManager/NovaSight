/**
 * SQL Editor Page
 * Full-featured SQL editor with schema explorer and results view
 */

import { useState, useCallback, useId, Suspense } from 'react'
import { Database, AlertCircle, Loader2, Save, FolderOpen, Zap } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SQLEditor } from '../components/SQLEditor'
import { ResultsTable } from '../components/ResultsTable'
import { SchemaExplorer } from '../components/SchemaExplorer'
import { QueryTabs } from '../components/QueryTabs'
import { useSqlQuery } from '../hooks/useSqlQuery'
import { useSchemaExplorer } from '../hooks/useSchemaExplorer'
import { useTenantClickHouseInfo } from '../hooks/useTenantClickHouse'
import { useSavedQueries, useCreateSavedQuery } from '../hooks/useSavedQueries'
import { useDataSources } from '@/features/datasources/hooks/useDataSources'
import type { QueryTab, DatasourceOption } from '../types'

const TENANT_CLICKHOUSE_ID = '__tenant_clickhouse__'

export function SqlEditorPage() {
  const newTabId = useId()
  
  // State
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<string>('')
  const [isClickhouse, setIsClickhouse] = useState(false)
  const [tabs, setTabs] = useState<QueryTab[]>([
    { id: newTabId, name: 'Query 1', sql: '' },
  ])
  const [activeTabId, setActiveTabId] = useState(newTabId)
  
  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveQueryType, setSaveQueryType] = useState<'adhoc' | 'pyspark' | 'dbt' | 'report'>('adhoc')

  // Get current tab
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]

  // Fetch datasources using the existing hook
  const { data: datasourcesData, isLoading: datasourcesLoading } = useDataSources()
  const datasources = datasourcesData?.items || []
  
  // Fetch tenant ClickHouse info
  const { data: clickhouseInfo } = useTenantClickHouseInfo()
  
  // Fetch saved queries
  const { data: savedQueriesData } = useSavedQueries()
  const savedQueries = savedQueriesData?.items || []
  
  // Create saved query mutation
  const createSavedQuery = useCreateSavedQuery()

  // Combine datasources with tenant ClickHouse
  const allDatasources: DatasourceOption[] = [
    // Tenant ClickHouse first
    ...(clickhouseInfo ? [{
      id: TENANT_CLICKHOUSE_ID,
      name: clickhouseInfo.name,
      db_type: 'clickhouse',
      status: 'active',
      is_tenant_clickhouse: true,
    }] : []),
    // Then configured connections
    ...datasources.map(ds => ({
      id: ds.id,
      name: ds.name,
      db_type: ds.db_type,
      status: ds.status,
      is_tenant_clickhouse: false,
    })),
  ]

  // Get the actual connection ID for schema explorer (not for ClickHouse)
  const schemaConnectionId = isClickhouse ? undefined : selectedDatasourceId

  // Schema explorer
  const {
    schemas,
    isLoading: schemaLoading,
    error: schemaError,
    refetch: refetchSchema,
  } = useSchemaExplorer(schemaConnectionId)

  // SQL query execution
  const { execute, result, error, isLoading: queryLoading } = useSqlQuery()

  // Handle datasource selection
  const handleDatasourceChange = useCallback((value: string) => {
    setSelectedDatasourceId(value)
    setIsClickhouse(value === TENANT_CLICKHOUSE_ID)
  }, [])

  // Update tab SQL
  const updateTabSql = useCallback((sql: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, sql, isDirty: true } : tab
      )
    )
  }, [activeTabId])

  // Execute query
  const handleExecute = useCallback(() => {
    if (!selectedDatasourceId || !activeTab.sql.trim()) return

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, isExecuting: true } : tab
      )
    )

    execute({
      sql: activeTab.sql,
      datasourceId: isClickhouse ? undefined : selectedDatasourceId,
      isClickhouse,
    })

    // Update tab when done
    setTimeout(() => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, isExecuting: false } : tab
        )
      )
    }, 0)
  }, [selectedDatasourceId, activeTab, activeTabId, execute, isClickhouse])

  // Save query handler
  const handleSaveQuery = useCallback(async () => {
    if (!saveName.trim() || !activeTab.sql.trim()) return
    
    try {
      await createSavedQuery.mutateAsync({
        name: saveName,
        description: saveDescription,
        sql: activeTab.sql,
        connection_id: isClickhouse ? undefined : selectedDatasourceId,
        is_clickhouse: isClickhouse,
        query_type: saveQueryType,
      })
      
      setSaveDialogOpen(false)
      setSaveName('')
      setSaveDescription('')
      setSaveQueryType('adhoc')
      
      // Mark tab as saved
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, isDirty: false, name: saveName } : tab
        )
      )
    } catch (err) {
      console.error('Failed to save query:', err)
    }
  }, [saveName, saveDescription, activeTab.sql, isClickhouse, selectedDatasourceId, createSavedQuery, activeTabId, saveQueryType])

  // Load saved query handler
  const handleLoadQuery = useCallback((query: { name: string; sql: string; connection_id?: string; is_clickhouse: boolean }) => {
    updateTabSql(query.sql)
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, name: query.name, isDirty: false } : tab
      )
    )
    
    // Set datasource if specified
    if (query.is_clickhouse) {
      handleDatasourceChange(TENANT_CLICKHOUSE_ID)
    } else if (query.connection_id) {
      handleDatasourceChange(query.connection_id)
    }
    
    setLoadDialogOpen(false)
  }, [updateTabSql, activeTabId, handleDatasourceChange])

  // Handle column click from schema explorer
  const handleColumnClick = useCallback(
    (_tableName: string, columnName: string) => {
      updateTabSql(activeTab.sql + columnName + ' ')
    },
    [activeTab.sql, updateTabSql]
  )

  // Handle table click - insert SELECT * FROM table
  const handleTableClick = useCallback(
    (tableName: string) => {
      const query = `SELECT * FROM ${tableName} LIMIT 100`
      updateTabSql(query)
    },
    [updateTabSql]
  )

  // Tab management
  const handleNewTab = useCallback(() => {
    const newId = `tab-${Date.now()}`
    const newTab: QueryTab = {
      id: newId,
      name: `Query ${tabs.length + 1}`,
      sql: '',
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newId)
  }, [tabs.length])

  const handleCloseTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId)
        if (tabId === activeTabId && filtered.length > 0) {
          setActiveTabId(filtered[filtered.length - 1].id)
        }
        return filtered
      })
    },
    [activeTabId]
  )

  const handleRenameTab = useCallback((tabId: string, name: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, name } : tab))
    )
  }, [])

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">SQL Editor</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Save/Load buttons */}
          <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Load
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Load Saved Query</DialogTitle>
                <DialogDescription>
                  Select a saved query to load into the editor
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-auto max-h-96">
                {savedQueries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No saved queries yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedQueries.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => handleLoadQuery(q)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{q.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              q.query_type === 'pyspark' ? 'bg-orange-100 text-orange-700' :
                              q.query_type === 'dbt' ? 'bg-green-100 text-green-700' :
                              q.query_type === 'report' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {q.query_type || 'adhoc'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {q.is_clickhouse ? 'ClickHouse' : 'Connection'}
                          </span>
                        </div>
                        {q.description && (
                          <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                        )}
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                          {q.sql.substring(0, 100)}...
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!activeTab.sql.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Query</DialogTitle>
                <DialogDescription>
                  Save this query for reuse in PySpark builder or dbt modeling
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g., Active Users Query"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="What does this query do?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="queryType">Query Type</Label>
                  <Select
                    value={saveQueryType}
                    onValueChange={(v) => setSaveQueryType(v as 'adhoc' | 'pyspark' | 'dbt' | 'report')}
                  >
                    <SelectTrigger id="queryType">
                      <SelectValue placeholder="Select query type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adhoc">
                        <span>Ad-hoc Query</span>
                      </SelectItem>
                      <SelectItem value="pyspark">
                        <span>PySpark Source</span>
                      </SelectItem>
                      <SelectItem value="dbt">
                        <span>dbt Model</span>
                      </SelectItem>
                      <SelectItem value="report">
                        <span>Report/Dashboard</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    PySpark and dbt queries will appear in their respective builders
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveQuery} 
                  disabled={!saveName.trim() || createSavedQuery.isPending}
                >
                  {createSavedQuery.isPending ? 'Saving...' : 'Save Query'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Datasource selector */}
          <Select
            value={selectedDatasourceId}
            onValueChange={handleDatasourceChange}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder={datasourcesLoading ? "Loading..." : "Select a data source"} />
            </SelectTrigger>
            <SelectContent>
              {allDatasources.length === 0 && !datasourcesLoading ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No data sources available.
                  <br />
                  Create one in Connections.
                </div>
              ) : (
                <>
                  {/* Tenant ClickHouse section */}
                  {clickhouseInfo && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Tenant Analytics
                      </div>
                      <SelectItem value={TENANT_CLICKHOUSE_ID}>
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-orange-500" />
                          <span>{clickhouseInfo.name}</span>
                        </div>
                      </SelectItem>
                      <div className="my-1 border-t" />
                    </>
                  )}
                  
                  {/* Configured connections */}
                  {datasources.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Configured Connections
                      </div>
                      {datasources.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                ds.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            />
                            <span>{ds.name}</span>
                            <span className="text-xs text-muted-foreground">({ds.db_type})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Query Tabs */}
      <QueryTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabClose={handleCloseTab}
        onNewTab={handleNewTab}
        onTabRename={handleRenameTab}
      />

      {/* Main Content */}
      {!selectedDatasourceId ? (
        <div className="flex-1 flex items-center justify-center">
          <Alert className="max-w-md">
            <Database className="h-4 w-4" />
            <AlertDescription>
              Select a data source to start writing SQL queries.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Schema Explorer - Left Sidebar */}
          <div className="w-64 border-r flex-shrink-0 overflow-hidden">
            <SchemaExplorer
              schemas={schemas}
              isLoading={schemaLoading}
              error={schemaError}
              onRefresh={() => refetchSchema()}
              onColumnClick={handleColumnClick}
              onTableClick={handleTableClick}
              className="h-full"
            />
          </div>

          {/* Editor and Results - Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* SQL Editor */}
            <div className="h-1/3 min-h-[200px] border-b">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              }>
                <SQLEditor
                  value={activeTab.sql}
                  onChange={updateTabSql}
                  onExecute={handleExecute}
                  isExecuting={queryLoading}
                  executionTime={result?.executionTimeMs}
                  rowCount={result?.rowCount}
                  className="h-full"
                />
              </Suspense>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-hidden">
              {error ? (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <pre className="mt-2 text-sm whitespace-pre-wrap">{error}</pre>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : result ? (
                <ResultsTable result={result} className="h-full" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Run a query to see results
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
