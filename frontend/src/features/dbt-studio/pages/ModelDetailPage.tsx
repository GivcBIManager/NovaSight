/**
 * Model Detail Page
 * 
 * Detailed view for a single dbt model.
 * Shows SQL, lineage, tests, and documentation.
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Code2,
  GitBranch,
  TestTube,
  FileText,
  Play,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { fadeVariants } from '@/lib/motion-variants'
import { LineageViewer } from '@/features/dbt-studio/components'
import { useModel, useModelSql, useTests, useTestResults, useDbtRun, useDbtTest } from '@/features/dbt-studio/hooks/useDbtStudio'

export function ModelDetailPage() {
  const { modelName } = useParams<{ modelName: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('sql')

  // API hooks
  const { data: model, isLoading: modelLoading } = useModel(modelName || '')
  const { data: sqlData, isLoading: sqlLoading } = useModelSql(modelName || '')
  const { data: tests, isLoading: testsLoading } = useTests(modelName)
  const { data: testResults } = useTestResults(modelName)
  const dbtRunMutation = useDbtRun()
  const dbtTestMutation = useDbtTest()

  // Run this model
  const handleRunModel = async () => {
    if (!modelName) return
    try {
      await dbtRunMutation.mutateAsync({ select: modelName })
      toast({ title: 'Model run completed' })
    } catch {
      toast({ title: 'Model run failed', variant: 'destructive' })
    }
  }

  // Test this model
  const handleTestModel = async () => {
    if (!modelName) return
    try {
      await dbtTestMutation.mutateAsync({ select: modelName })
      toast({ title: 'Model tests completed' })
    } catch {
      toast({ title: 'Model tests failed', variant: 'destructive' })
    }
  }

  // Copy SQL
  const handleCopySql = () => {
    if (sqlData?.sql) {
      navigator.clipboard.writeText(sqlData.sql)
      toast({ title: 'SQL copied to clipboard' })
    }
  }

  if (modelLoading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!model) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">Model not found: {modelName}</p>
        <Button onClick={() => navigate('/app/dbt-studio')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dbt Studio
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/dbt-studio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{model.name}</h1>
              <Badge variant="secondary">{model.resource_type}</Badge>
              {model.materialization && (
                <Badge variant="outline">{model.materialization}</Badge>
              )}
            </div>
            {model.description && (
              <p className="text-gray-500 mt-1">{model.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunModel}
            disabled={dbtRunMutation.isPending}
          >
            {dbtRunMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run Model
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestModel}
            disabled={dbtTestMutation.isPending}
          >
            {dbtTestMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-1" />
            )}
            Run Tests
          </Button>
        </div>
      </motion.div>

      {/* Model Info */}
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-4"
      >
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="text-sm text-gray-500">Database</div>
            <div className="font-medium">{model.database || '-'}</div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="text-sm text-gray-500">Schema</div>
            <div className="font-medium">{model.schema_name || '-'}</div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="text-sm text-gray-500">Path</div>
            <div className="font-medium font-mono text-xs truncate">{model.path || '-'}</div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="text-sm text-gray-500">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {model.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {(!model.tags || model.tags.length === 0) && <span className="text-gray-400">-</span>}
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sql" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            SQL
          </TabsTrigger>
          <TabsTrigger value="lineage" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Lineage
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="columns" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Columns
          </TabsTrigger>
        </TabsList>

        {/* SQL Tab */}
        <TabsContent value="sql">
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Compiled SQL</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopySql}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              {sqlLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : sqlData?.sql ? (
                <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto max-h-[500px]">
                  {sqlData.sql}
                </pre>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Unable to load compiled SQL
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lineage Tab */}
        <TabsContent value="lineage" className="h-[500px]">
          <LineageViewer
            modelName={modelName}
            upstream
            downstream
            depth={2}
          />
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Model Tests</CardTitle>
              <CardDescription>Tests configured for this model</CardDescription>
            </CardHeader>
            <CardContent>
              {testsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : tests?.tests && tests.tests.length > 0 ? (
                <div className="space-y-2">
                  {(tests.tests as Array<{ name: string; column?: string }>).map((test, index) => {
                    const result = testResults?.results?.find((r) => r.name === test.name)
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {result?.status === 'pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : result?.status === 'fail' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium">{test.name}</div>
                            <div className="text-xs text-gray-500">
                              {test.column && `Column: ${test.column}`}
                            </div>
                          </div>
                        </div>
                        <Badge variant={result?.status === 'pass' ? 'default' : result?.status === 'fail' ? 'destructive' : 'secondary'}>
                          {result?.status || 'not run'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No tests configured for this model
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Columns Tab */}
        <TabsContent value="columns">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Columns</CardTitle>
              <CardDescription>Column definitions and documentation</CardDescription>
            </CardHeader>
            <CardContent>
              {model.columns && Object.keys(model.columns).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(model.columns).map(([name, col]) => (
                    <div
                      key={name}
                      className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="font-medium font-mono">{name}</div>
                        {col.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {col.description}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {col.data_type && (
                          <Badge variant="outline">{col.data_type}</Badge>
                        )}
                        {col.tests && col.tests.length > 0 && (
                          <Badge variant="secondary">
                            <TestTube className="h-3 w-3 mr-1" />
                            {col.tests.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No column documentation available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ModelDetailPage
