import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  TestTube,
  Hammer,
  Sprout,
  Camera,
  Package,
  FileCode,
  Network,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'

interface DbtCommandResult {
  success: boolean
  command: string
  stdout: string
  stderr: string
  return_code: number
  run_results?: Record<string, unknown>
  manifest?: Record<string, unknown>
}

interface DbtModel {
  unique_id: string
  name: string
  description: string
  resource_type: string
  schema: string
  database: string
  materialized: string
  depends_on: string[]
  columns: Record<string, unknown>
}

interface DbtLineage {
  model: string
  unique_id: string
  upstream: Array<{ name: string; resource_type: string; unique_id: string }>
  downstream: Array<{ name: string; resource_type: string; unique_id: string }>
  columns: Record<string, unknown>
  description: string
}

// ── Operations ──
const dbtOperations = [
  {
    id: 'run',
    name: 'Run Models',
    description: 'Execute dbt models to materialize transformations',
    icon: Play,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    endpoint: '/dbt/run',
  },
  {
    id: 'test',
    name: 'Run Tests',
    description: 'Execute dbt tests to validate data quality',
    icon: TestTube,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    endpoint: '/dbt/test',
  },
  {
    id: 'build',
    name: 'Build',
    description: 'Run models and tests in DAG order',
    icon: Hammer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    endpoint: '/dbt/build',
  },
  {
    id: 'seed',
    name: 'Load Seeds',
    description: 'Load CSV seed data into your warehouse',
    icon: Sprout,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    endpoint: '/dbt/seed',
  },
  {
    id: 'snapshot',
    name: 'Run Snapshots',
    description: 'Execute SCD Type 2 snapshots',
    icon: Camera,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    endpoint: '/dbt/snapshot',
  },
  {
    id: 'compile',
    name: 'Compile',
    description: 'Compile models without executing — preview SQL',
    icon: FileCode,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    endpoint: '/dbt/compile',
  },
  {
    id: 'deps',
    name: 'Install Packages',
    description: 'Install dbt packages from packages.yml',
    icon: Package,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    endpoint: '/dbt/deps',
  },
  {
    id: 'docs',
    name: 'Generate Docs',
    description: 'Generate dbt documentation site',
    icon: BookOpen,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    endpoint: '/dbt/docs/generate',
  },
]

export function DbtOperationsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('operations')
  const [selectedOperation, setSelectedOperation] = useState<typeof dbtOperations[0] | null>(null)
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [lineageModel, setLineageModel] = useState('')
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  // Operation form state
  const [selectModels, setSelectModels] = useState('')
  const [excludeModels, setExcludeModels] = useState('')
  const [fullRefresh, setFullRefresh] = useState(false)
  const [targetName, setTargetName] = useState('')

  // ── Queries ──
  const { data: connectionStatus, isLoading: isCheckingConnection } = useQuery({
    queryKey: ['dbt', 'status'],
    queryFn: async () => {
      const res = await api.get('/dbt/status')
      return res.data
    },
  })

  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ['dbt', 'models', modelSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (modelSearch) params.set('search', modelSearch)
      params.set('limit', '100')
      const res = await api.get(`/dbt/models?${params.toString()}`)
      return res.data
    },
    enabled: activeTab === 'models',
  })

  const { data: lineageData, isLoading: isLoadingLineage } = useQuery({
    queryKey: ['dbt', 'lineage', lineageModel],
    queryFn: async () => {
      const res = await api.get(`/dbt/lineage/${lineageModel}`)
      return res.data as DbtLineage
    },
    enabled: !!lineageModel,
  })

  // ── Mutations ──
  const runOperationMutation = useMutation({
    mutationFn: async (params: { endpoint: string; body?: Record<string, unknown> }) => {
      const res = params.body
        ? await api.post(params.endpoint, params.body)
        : await api.post(params.endpoint)
      return res.data as DbtCommandResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbt'] })
    },
  })

  const parseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/dbt/parse')
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbt', 'models'] })
    },
  })

  // ── Handlers ──
  function openRunDialog(operation: typeof dbtOperations[0]) {
    setSelectedOperation(operation)
    setSelectModels('')
    setExcludeModels('')
    setFullRefresh(false)
    setTargetName('')
    setRunDialogOpen(true)
  }

  function executeOperation() {
    if (!selectedOperation) return

    const body: Record<string, unknown> = {}
    if (selectModels) body.select = selectModels
    if (excludeModels) body.exclude = excludeModels
    if (fullRefresh) body.full_refresh = true
    if (targetName) body.target = targetName

    runOperationMutation.mutate({
      endpoint: selectedOperation.endpoint,
      body: Object.keys(body).length > 0 ? body : undefined,
    })
    setRunDialogOpen(false)
  }

  const models: DbtModel[] = modelsData?.models ?? modelsData?.data ?? []

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">dbt Transformations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and run dbt operations for your data transformations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <Badge
            variant={connectionStatus?.connected ? 'default' : 'destructive'}
            className="gap-1"
          >
            {isCheckingConnection ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : connectionStatus?.connected ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {connectionStatus?.connected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => parseMutation.mutate()}
            disabled={parseMutation.isPending}
          >
            {parseMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Parse Project
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
          <TabsTrigger value="results">Run Results</TabsTrigger>
        </TabsList>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dbtOperations.map((op) => (
              <Card
                key={op.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openRunDialog(op)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${op.bgColor}`}>
                      <op.icon className={`h-5 w-5 ${op.color}`} />
                    </div>
                    <CardTitle className="text-base">{op.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{op.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Last Run Result */}
          {runOperationMutation.data && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {runOperationMutation.data.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    Last Run: {runOperationMutation.data.command}
                  </CardTitle>
                  <Badge variant={runOperationMutation.data.success ? 'default' : 'destructive'}>
                    Exit Code: {runOperationMutation.data.return_code}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {runOperationMutation.data.stdout && (
                    <div>
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        stdout
                      </Label>
                      <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                        {runOperationMutation.data.stdout}
                      </pre>
                    </div>
                  )}
                  {runOperationMutation.data.stderr && (
                    <div>
                      <Label className="text-xs font-semibold uppercase text-red-600">stderr</Label>
                      <pre className="mt-1 p-3 bg-red-50 dark:bg-red-950 rounded-md text-xs overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap text-red-800 dark:text-red-200">
                        {runOperationMutation.data.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {runOperationMutation.isError && (
            <Card className="mt-6 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>
                    Operation failed:{' '}
                    {(runOperationMutation.error as Error)?.message ?? 'Unknown error'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoadingModels ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : models.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No models found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try parsing the project or adjusting your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card key={model.unique_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{model.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {model.materialized}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {model.schema}.{model.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {model.description && (
                      <p className="text-xs text-muted-foreground mb-3">{model.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {model.resource_type}
                      </Badge>
                      {model.depends_on?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {model.depends_on.length} deps
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-xs"
                        onClick={() => {
                          setLineageModel(model.name)
                          setActiveTab('lineage')
                        }}
                      >
                        <Network className="mr-1 h-3 w-3" />
                        Lineage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lineage Tab */}
        <TabsContent value="lineage" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter model name for lineage..."
                value={lineageModel}
                onChange={(e) => setLineageModel(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoadingLineage ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lineageData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Upstream */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Upstream ({lineageData.upstream?.length ?? 0})
                  </CardTitle>
                  <CardDescription className="text-xs">Models this depends on</CardDescription>
                </CardHeader>
                <CardContent>
                  {lineageData.upstream?.length ? (
                    <div className="space-y-2">
                      {lineageData.upstream.map((dep) => (
                        <div
                          key={dep.unique_id}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => setLineageModel(dep.name)}
                        >
                          <span className="text-sm font-medium">{dep.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {dep.resource_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No upstream dependencies</p>
                  )}
                </CardContent>
              </Card>

              {/* Current Model */}
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-sm">{lineageData.model}</CardTitle>
                  <CardDescription className="text-xs">{lineageData.unique_id}</CardDescription>
                </CardHeader>
                <CardContent>
                  {lineageData.description && (
                    <p className="text-xs text-muted-foreground mb-3">{lineageData.description}</p>
                  )}
                  {lineageData.columns && Object.keys(lineageData.columns).length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Columns
                      </Label>
                      <div className="mt-1 space-y-1">
                        {Object.keys(lineageData.columns).map((col) => (
                          <div key={col} className="text-xs p-1 rounded bg-muted/50">
                            {col}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Downstream */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Downstream ({lineageData.downstream?.length ?? 0})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Models that depend on this
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lineageData.downstream?.length ? (
                    <div className="space-y-2">
                      {lineageData.downstream.map((dep) => (
                        <div
                          key={dep.unique_id}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => setLineageModel(dep.name)}
                        >
                          <span className="text-sm font-medium">{dep.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {dep.resource_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No downstream dependents</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Network className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Model Lineage</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter a model name above to view its upstream and downstream dependencies.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {runOperationMutation.data ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {runOperationMutation.data.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    {runOperationMutation.data.command}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={runOperationMutation.data.success ? 'default' : 'destructive'}
                    >
                      Exit Code: {runOperationMutation.data.return_code}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {runOperationMutation.data.stdout && (
                  <div>
                    <button
                      className="flex items-center gap-1 text-sm font-medium mb-1"
                      onClick={() =>
                        setExpandedResult(expandedResult === 'stdout' ? null : 'stdout')
                      }
                    >
                      {expandedResult === 'stdout' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Standard Output
                    </button>
                    {expandedResult === 'stdout' && (
                      <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {runOperationMutation.data.stdout}
                      </pre>
                    )}
                  </div>
                )}
                {runOperationMutation.data.stderr && (
                  <div>
                    <button
                      className="flex items-center gap-1 text-sm font-medium mb-1 text-red-600"
                      onClick={() =>
                        setExpandedResult(expandedResult === 'stderr' ? null : 'stderr')
                      }
                    >
                      {expandedResult === 'stderr' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Error Output
                    </button>
                    {expandedResult === 'stderr' && (
                      <pre className="p-3 bg-red-50 dark:bg-red-950 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap text-red-800 dark:text-red-200">
                        {runOperationMutation.data.stderr}
                      </pre>
                    )}
                  </div>
                )}
                {runOperationMutation.data.run_results && (
                  <div>
                    <button
                      className="flex items-center gap-1 text-sm font-medium mb-1"
                      onClick={() =>
                        setExpandedResult(
                          expandedResult === 'run_results' ? null : 'run_results'
                        )
                      }
                    >
                      {expandedResult === 'run_results' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Run Results (JSON)
                    </button>
                    {expandedResult === 'run_results' && (
                      <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(runOperationMutation.data.run_results, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Results Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Run an operation from the Operations tab to see results here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Run Operation Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOperation && (
                <>
                  <selectedOperation.icon className={`h-5 w-5 ${selectedOperation.color}`} />
                  {selectedOperation.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedOperation?.description}. Configure options below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Select / Exclude not applicable for deps & docs */}
            {selectedOperation &&
              !['deps', 'docs'].includes(selectedOperation.id) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="select-models">Select Models</Label>
                    <Input
                      id="select-models"
                      placeholder="e.g. +my_model, tag:daily"
                      value={selectModels}
                      onChange={(e) => setSelectModels(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      dbt node selection syntax. Leave empty for all models.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exclude-models">Exclude Models</Label>
                    <Input
                      id="exclude-models"
                      placeholder="e.g. staging.*"
                      value={excludeModels}
                      onChange={(e) => setExcludeModels(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="full-refresh"
                      checked={fullRefresh}
                      onCheckedChange={(checked) => setFullRefresh(checked as boolean)}
                    />
                    <Label htmlFor="full-refresh" className="text-sm">
                      Full refresh (rebuild incremental models from scratch)
                    </Label>
                  </div>
                </>
              )}
            <div className="space-y-2">
              <Label htmlFor="target-name">Target</Label>
              <Input
                id="target-name"
                placeholder="Leave empty for default target"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={executeOperation}
              disabled={runOperationMutation.isPending}
            >
              {runOperationMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
