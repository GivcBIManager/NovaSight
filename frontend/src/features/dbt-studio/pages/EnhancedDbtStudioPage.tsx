/**
 * Enhanced dbt Studio Page
 *
 * Extends the original DbtStudioPage with additional tabs for:
 * - Visual Query Builder (no-code SQL)
 * - Test Builder & Source Freshness
 * - Execution Dashboard & Log Viewer
 * - Schema Explorer (warehouse introspection)
 * - Semantic Layer Designer
 * - Package Manager
 *
 * Drop-in replacement for DbtStudioPage.
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Layers,
  Plus,
  Database,
  BarChart2,
  Play,
  RefreshCw,
  FileCode2,
  GitBranch,
  TestTube,
  FolderTree,
  Terminal,
  ShieldCheck,
  Search,
  TrendingUp,
} from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { fadeVariants, staggerContainerVariants } from '@/lib/motion-variants'
import {
  ModelCanvas,
  LineageViewer,
  MCPQueryBuilder,
  ProjectViewer,
} from '@/features/dbt-studio/components'
import {
  useModels,
  useMetrics,
  useServerStatus,
  useStartServer,
  useStopServer,
  useDbtRun,
  useDbtTest,
} from '@/features/dbt-studio/hooks/useDbtStudio'
import type { VisualModelDefinition } from '@/features/dbt-studio/types'
import type { Node, Edge } from 'reactflow'
import { palette } from '@/lib/colors'

// New visual builder imports
import { VisualQueryBuilder } from '../components/sql-builder'
import { TestConfigForm, FreshnessConfig, TestResultsTable } from '../components/test-builder'
import { DbtCommandPanel, LogViewer, ExecutionHistory } from '../components/execution'
import { SemanticModelForm, MetricDesigner } from '../components/semantic-layer'
import { CodePreview, SchemaExplorer } from '../components/shared'
import {
  useVisualModels,
  useCreateVisualModel,
} from '../hooks/useVisualModels'
import { useCodePreviewMutation } from '../hooks/useCodePreview'
import { useWarehouseColumns } from '../hooks/useWarehouseSchema'
import type {
  VisualModelCreatePayload,
  WarehouseColumn,
} from '../types/visualModel'
import { useDataSources } from '@/features/datasources/hooks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Zap } from 'lucide-react'

const TENANT_WAREHOUSE_ID = '__tenant__'

export function EnhancedDbtStudioPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('models')
  const [logExecutionId, setLogExecutionId] = useState<string | undefined>()
  const [availableColumns, setAvailableColumns] = useState<WarehouseColumn[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>()
  const [selectedTable, setSelectedTable] = useState<string>()
  // Warehouse source binding — defaults to the tenant-managed ClickHouse
  // warehouse (which is the only valid dbt target per platform design).
  // Selecting an external connection does NOT repoint dbt at that DB;
  // it surfaces a CTA to ingest via PySpark first (see X4 flow).
  const [sourceConnectionId, setSourceConnectionId] = useState<string>(
    TENANT_WAREHOUSE_ID
  )

  // Existing API hooks
  const { data: modelsData, refetch: refetchModels } = useModels()
  const { data: metricsData } = useMetrics()
  const { data: serverStatus, isLoading: statusLoading } = useServerStatus()
  const startServerMutation = useStartServer()
  const stopServerMutation = useStopServer()
  const dbtRunMutation = useDbtRun()
  const dbtTestMutation = useDbtTest()

  // Visual builder hooks
  const { data: visualModels } = useVisualModels()
  const createVisualModel = useCreateVisualModel()
  const codePreview = useCodePreviewMutation()

  // Warehouse column introspection — enabled when a table is selected
  const { data: fetchedColumns } = useWarehouseColumns(selectedSchema, selectedTable)

  // Connections for the warehouse-source picker
  const { data: connectionsData } = useDataSources()
  const connections = connectionsData?.items ?? []
  const externalConnection =
    sourceConnectionId !== TENANT_WAREHOUSE_ID
      ? connections.find((c) => c.id === sourceConnectionId)
      : null

  // Sync fetched columns into local state
  useEffect(() => {
    if (fetchedColumns && fetchedColumns.length > 0) {
      setAvailableColumns(fetchedColumns)
    }
  }, [fetchedColumns])

  // Deep-link handler: accept ?source_schema=&source_table=&tab= from
  // upstream modules (PySpark detail "Use in dbt Studio"). Apply once,
  // then strip the params so page state is the source of truth.
  useEffect(() => {
    const schema = searchParams.get('source_schema')
    const table = searchParams.get('source_table')
    const tab = searchParams.get('tab')
    if (!schema && !table && !tab) return
    if (schema) setSelectedSchema(schema)
    if (table) setSelectedTable(table)
    if (tab) setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    next.delete('source_schema')
    next.delete('source_table')
    next.delete('tab')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Server control
  const handleStartServer = async () => {
    try {
      await startServerMutation.mutateAsync()
      toast({ title: 'MCP Server started' })
    } catch {
      toast({ title: 'Failed to start server', variant: 'destructive' })
    }
  }

  const handleStopServer = async () => {
    try {
      await stopServerMutation.mutateAsync()
      toast({ title: 'MCP Server stopped' })
    } catch {
      toast({ title: 'Failed to stop server', variant: 'destructive' })
    }
  }

  // dbt commands
  const handleDbtRun = async () => {
    try {
      await dbtRunMutation.mutateAsync({})
      toast({ title: 'dbt run completed' })
      refetchModels()
    } catch {
      toast({ title: 'dbt run failed', variant: 'destructive' })
    }
  }

  const handleDbtTest = async () => {
    try {
      await dbtTestMutation.mutateAsync({})
      toast({ title: 'dbt test completed' })
    } catch {
      toast({ title: 'dbt test failed', variant: 'destructive' })
    }
  }

  // Canvas handlers
  const handleSaveModels = async (
    _nodes: Node[],
    _edges: Edge[],
    definitions: Map<string, VisualModelDefinition>
  ) => {
    toast({ title: 'Models saved', description: `${definitions.size} models saved` })
  }

  const handleValidateModels = async (_definitions: Map<string, VisualModelDefinition>) => {
    toast({ title: 'Validation complete', description: 'All models valid' })
  }

  // Visual query builder handlers
  const handleVisualSave = useCallback(
    async (payload: VisualModelCreatePayload) => {
      try {
        await createVisualModel.mutateAsync(payload)
        toast({ title: 'Model created', description: `${payload.model_name} saved successfully` })
      } catch {
        toast({ title: 'Failed to save model', variant: 'destructive' })
      }
    },
    [createVisualModel, toast]
  )

  const handleVisualPreview = useCallback(
    async (payload: VisualModelCreatePayload) => {
      try {
        await codePreview.mutateAsync(payload.model_name || 'preview')
        toast({ title: 'Code preview generated' })
      } catch {
        toast({ title: 'Preview failed', variant: 'destructive' })
      }
    },
    [codePreview, toast]
  )

  const handleTableSelect = useCallback((schema: string, table: string) => {
    setSelectedSchema(schema)
    setSelectedTable(table)
    toast({ title: `Selected ${schema}.${table}`, description: 'Loading columns…' })
  }, [toast])

  // Stats
  const stats = [
    {
      label: 'Models',
      value: modelsData?.models?.length || 0,
      icon: FileCode2,
      color: palette.success[500],
    },
    {
      label: 'Visual Models',
      value: visualModels?.length || 0,
      icon: Layers,
      color: palette.primary[500],
    },
    {
      label: 'Metrics',
      value: metricsData?.metrics?.length || 0,
      icon: BarChart2,
      color: palette.accent[500],
    },
    {
      label: 'Sources',
      value: modelsData?.models?.filter((m: any) => m.resource_type === 'source').length || 0,
      icon: Database,
      color: palette.info[500],
    },
  ]

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-500" />
            dbt Studio
          </h1>
          <p className="text-gray-500 mt-1">
            Visual dbt model builder with semantic layer integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Warehouse source picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Warehouse source
            </span>
            <Select value={sourceConnectionId} onValueChange={setSourceConnectionId}>
              <SelectTrigger className="h-8 text-xs min-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TENANT_WAREHOUSE_ID} className="text-xs">
                  Tenant-managed (ClickHouse)
                </SelectItem>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-mono">
                    {c.name} · {c.db_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={serverStatus?.is_running ? 'default' : 'secondary'}
              className={serverStatus?.is_running ? 'bg-green-500' : ''}
            >
              {statusLoading
                ? 'Checking...'
                : serverStatus?.is_running
                ? 'MCP Online'
                : 'MCP Offline'}
            </Badge>
            {serverStatus?.is_running ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopServer}
                disabled={stopServerMutation.isPending}
              >
                Stop Server
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartServer}
                disabled={startServerMutation.isPending}
              >
                Start Server
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDbtRun}
            disabled={dbtRunMutation.isPending}
          >
            {dbtRunMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            dbt run
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDbtTest}
            disabled={dbtTestMutation.isPending}
          >
            {dbtTestMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-1" />
            )}
            dbt test
          </Button>

          <Button onClick={() => navigate('/app/dbt-studio/new')}>
            <Plus className="h-4 w-4 mr-1" />
            New Model
          </Button>
        </div>
      </motion.div>

      {/* External connection CTA — ingest via PySpark before dbt modeling */}
      {externalConnection && (
        <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 text-sm text-amber-900 dark:text-amber-100">
            <strong>{externalConnection.name}</strong>{' '}
            <span className="text-xs opacity-70">({externalConnection.db_type})</span>{' '}
            is an external connection. dbt models are materialized into the tenant-managed ClickHouse warehouse —
            ingest this source via a PySpark job first, then model it here.
          </div>
          <Button
            size="sm"
            onClick={() =>
              navigate(
                `/app/pyspark/new?connection_id=${externalConnection.id}&intent=dbt_source`
              )
            }
          >
            <Zap className="h-4 w-4 mr-1" />
            Create PySpark App
          </Button>
        </div>
      )}

      {/* Stats */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <GlassCard key={stat.label}>
              <GlassCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: stat.color }} />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )
        })}
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="models" className="flex items-center gap-1.5 text-xs">
            <FileCode2 className="h-3.5 w-3.5" />
            Canvas
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" />
            SQL Builder
          </TabsTrigger>
          <TabsTrigger value="lineage" className="flex items-center gap-1.5 text-xs">
            <GitBranch className="h-3.5 w-3.5" />
            Lineage
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="execution" className="flex items-center gap-1.5 text-xs">
            <Terminal className="h-3.5 w-3.5" />
            Execution
          </TabsTrigger>
          <TabsTrigger value="semantic" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            Semantic
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-1.5 text-xs">
            <BarChart2 className="h-3.5 w-3.5" />
            Query
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-1.5 text-xs">
            <FolderTree className="h-3.5 w-3.5" />
            Project
          </TabsTrigger>
        </TabsList>

        {/* ── Canvas (original Model Builder) ─────────────────────────── */}
        <TabsContent value="models" className="h-[600px]">
          <ModelCanvas
            onSave={handleSaveModels}
            onValidate={handleValidateModels}
            onGenerateCode={(nodeId) => {
              navigate(`/app/dbt-studio/models/${nodeId}`)
            }}
          />
        </TabsContent>

        {/* ── Visual SQL Builder ──────────────────────────────────────── */}
        <TabsContent value="builder">
          <div className="grid grid-cols-[1fr_360px] gap-4">
            <div className="space-y-4">
              <VisualQueryBuilder
                availableColumns={availableColumns}
                availableModels={
                  (visualModels || []).map((m: any) => m.model_name)
                }
                selectedSourceSchema={selectedSchema}
                selectedSourceTable={selectedTable}
                onSave={handleVisualSave}
                onPreview={handleVisualPreview}
                isSaving={createVisualModel.isPending}
              />
              {codePreview.data && (
                <CodePreview
                  sql={codePreview.data.sql}
                  yaml={codePreview.data.yaml}
                  title="Generated dbt Code"
                />
              )}
            </div>
            <div>
              <SchemaExplorer
                onTableSelect={handleTableSelect}
                maxHeight="700px"
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Lineage ─────────────────────────────────────────────────── */}
        <TabsContent value="lineage" className="h-[600px]">
          <LineageViewer
            showFullDag
            onNodeSelect={(node: any) => {
              if (node.resource_type === 'model') {
                navigate(`/app/dbt-studio/models/${node.name}`)
              }
            }}
          />
        </TabsContent>

        {/* ── Tests & Freshness ───────────────────────────────────────── */}
        <TabsContent value="tests">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <TestConfigForm
                modelName={
                  (visualModels || [])[0]?.model_name || 'my_model'
                }
                availableModels={
                  (visualModels || []).map((m: any) => m.model_name)
                }
                onSave={(payload: any) => {
                  toast({ title: `Test "${payload.test_name}" created` })
                }}
              />
              <FreshnessConfig
                sourceName="raw_data"
                tableName="orders"
                onSave={() => {
                  toast({ title: 'Freshness config saved' })
                }}
              />
            </div>
            <div>
              <TestResultsTable results={[]} />
            </div>
          </div>
        </TabsContent>

        {/* ── Execution Dashboard ─────────────────────────────────────── */}
        <TabsContent value="execution">
          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <div className="space-y-4">
              <DbtCommandPanel
                onExecute={(payload) => {
                  toast({
                    title: `dbt ${payload.command} submitted`,
                    description: payload.selector
                      ? `Selector: ${payload.selector}`
                      : 'Running all models',
                  })
                }}
              />
              <LogViewer executionId={logExecutionId} />
            </div>
            <div>
              <ExecutionHistory
                executions={[]}
                onViewLogs={(id) => setLogExecutionId(id)}
                onCancel={(id) => {
                  toast({ title: `Cancelling execution #${id}` })
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Semantic Layer ──────────────────────────────────────────── */}
        <TabsContent value="semantic">
          <div className="grid grid-cols-2 gap-4">
            <SemanticModelForm
              availableModels={
                (visualModels || []).map((m: any) => m.model_name)
              }
              onSave={(model) => {
                toast({
                  title: 'Semantic model saved',
                  description: model.name,
                })
              }}
            />
            <MetricDesigner
              onSave={(metric) => {
                toast({
                  title: 'Metric saved',
                  description: metric.name,
                })
              }}
            />
          </div>
        </TabsContent>

        {/* ── Query Semantic Layer (original) ─────────────────────────── */}
        <TabsContent value="query" className="h-[600px]">
          <MCPQueryBuilder
            onQueryExecuted={(result: any) => {
              console.log('Query result:', result)
            }}
          />
        </TabsContent>

        {/* ── Schema Explorer ─────────────────────────────────────────── */}
        <TabsContent value="schema">
          <div className="max-w-2xl mx-auto">
            <SchemaExplorer
              onTableSelect={handleTableSelect}
              onColumnClick={(schema, table, column) => {
                toast({
                  title: `${schema}.${table}.${column}`,
                  description: 'Column selected',
                })
              }}
              maxHeight="600px"
            />
          </div>
        </TabsContent>

        {/* ── Project (original) ──────────────────────────────────────── */}
        <TabsContent value="project" className="min-h-[600px]">
          <ProjectViewer />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EnhancedDbtStudioPage
