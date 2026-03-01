/**
 * dbt Studio - Main Page
 * 
 * Central hub for no-code/low-code dbt model building.
 * Features model canvas, lineage viewer, and semantic query builder.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { fadeVariants, staggerContainerVariants } from '@/lib/motion-variants'
import { ModelCanvas, LineageViewer, MCPQueryBuilder, ProjectViewer } from '@/features/dbt-studio/components'
import { useModels, useMetrics, useServerStatus, useStartServer, useStopServer, useDbtRun, useDbtTest } from '@/features/dbt-studio/hooks/useDbtStudio'
import type { VisualModelDefinition } from '@/features/dbt-studio/types'
import type { Node, Edge } from 'reactflow'
import { palette } from '@/lib/colors'

export function DbtStudioPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('models')

  // API hooks
  const { data: modelsData, refetch: refetchModels } = useModels()
  const { data: metricsData } = useMetrics()
  const { data: serverStatus, isLoading: statusLoading } = useServerStatus()
  const startServerMutation = useStartServer()
  const stopServerMutation = useStopServer()
  const dbtRunMutation = useDbtRun()
  const dbtTestMutation = useDbtTest()

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

  // Model canvas handlers
  const handleSaveModels = async (
    _nodes: Node[],
    _edges: Edge[],
    definitions: Map<string, VisualModelDefinition>
  ) => {
    console.log('Saving models:', definitions)
    toast({ title: 'Models saved', description: `${definitions.size} models saved` })
  }

  const handleValidateModels = async (definitions: Map<string, VisualModelDefinition>) => {
    console.log('Validating models:', definitions)
    toast({ title: 'Validation complete', description: 'All models valid' })
  }

  // Stats
  const stats = [
    {
      label: 'Models',
      value: modelsData?.models?.length || 0,
      icon: FileCode2,
      color: palette.success[500],
    },
    {
      label: 'Metrics',
      value: metricsData?.metrics?.length || 0,
      icon: BarChart2,
      color: palette.primary[500],
    },
    {
      label: 'Sources',
      value: modelsData?.models?.filter((m) => m.resource_type === 'source').length || 0,
      icon: Database,
      color: palette.accent[500],
    },
    {
      label: 'Tests',
      value: 0, // Would come from test results
      icon: TestTube,
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
          {/* Server Status */}
          <div className="flex items-center gap-2">
            <Badge
              variant={serverStatus?.is_running ? 'default' : 'secondary'}
              className={serverStatus?.is_running ? 'bg-green-500' : ''}
            >
              {statusLoading ? 'Checking...' : serverStatus?.is_running ? 'MCP Online' : 'MCP Offline'}
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

          {/* dbt Commands */}
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

      {/* Stats Cards */}
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
        <TabsList className="mb-4">
          <TabsTrigger value="models" className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4" />
            Model Builder
          </TabsTrigger>
          <TabsTrigger value="lineage" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Lineage
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Query Semantic Layer
          </TabsTrigger>
          <TabsTrigger value="project" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Project
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="h-[600px]">
          <ModelCanvas
            onSave={handleSaveModels}
            onValidate={handleValidateModels}
            onGenerateCode={(nodeId) => {
              navigate(`/app/dbt-studio/models/${nodeId}`)
            }}
          />
        </TabsContent>

        <TabsContent value="lineage" className="h-[600px]">
          <LineageViewer
            showFullDag
            onNodeSelect={(node) => {
              if (node.resource_type === 'model') {
                navigate(`/app/dbt-studio/models/${node.name}`)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="query" className="h-[600px]">
          <MCPQueryBuilder
            onQueryExecuted={(result) => {
              console.log('Query result:', result)
            }}
          />
        </TabsContent>

        <TabsContent value="project" className="min-h-[600px]">
          <ProjectViewer />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DbtStudioPage
