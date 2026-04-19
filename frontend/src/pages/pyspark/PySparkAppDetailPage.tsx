/**
 * PySpark App Detail Page
 * 
 * Displays details of a PySpark app with code preview and actions.
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Play, 
  Copy, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileCode,
  Database,
  Table2,
  Key,
  Layers,
  Settings,
  Loader2,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Rocket,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { PageHeader } from '@/components/common'
import { 
  usePySparkApp, 
  useDeletePySparkApp, 
  useGeneratePySparkCode,
  useActivatePySparkApp,
  useDeactivatePySparkApp,
  useRunPySparkApp
} from '@/features/pyspark/hooks'
import { PySparkAppStatus, SCDType, WriteMode, CDCType } from '@/types/pyspark'

// Status badge configurations
const STATUS_CONFIG: Record<PySparkAppStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  draft: { 
    label: 'Draft', 
    variant: 'secondary', 
    icon: <FileCode className="h-3 w-3" /> 
  },
  active: { 
    label: 'Active', 
    variant: 'default', 
    icon: <CheckCircle className="h-3 w-3" /> 
  },
  inactive: { 
    label: 'Inactive', 
    variant: 'outline', 
    icon: <Clock className="h-3 w-3" /> 
  },
  error: { 
    label: 'Error', 
    variant: 'destructive', 
    icon: <AlertCircle className="h-3 w-3" /> 
  },
}

// Labels
const SCD_LABELS: Record<SCDType, string> = {
  none: 'None (Simple Extract)',
  type1: 'SCD Type 1 (Overwrite)',
  type2: 'SCD Type 2 (Historical)',
}

const WRITE_MODE_LABELS: Record<WriteMode, string> = {
  overwrite: 'Overwrite',
  append: 'Append',
  merge: 'Merge',
}

const CDC_LABELS: Record<CDCType, string> = {
  none: 'None',
  timestamp: 'Timestamp Column',
  version: 'Version Column',
  hash: 'Hash Based',
}

export function PySparkAppDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(true)
  
  // Fetch app with generated code included
  const { data: app, isLoading, error, refetch } = usePySparkApp(id!, true)
  const deleteApp = useDeletePySparkApp()
  const generateCode = useGeneratePySparkCode()
  const activateApp = useActivatePySparkApp()
  const deactivateApp = useDeactivatePySparkApp()
  const runApp = useRunPySparkApp()
  
  // Handle activate
  const handleActivate = async () => {
    if (!app) return
    
    try {
      await activateApp.mutateAsync(app.id)
      await refetch()
      toast({
        title: 'App Activated',
        description: 'The app is now active and will appear in Dagster.',
      })
    } catch (error: any) {
      toast({
        title: 'Activation Failed',
        description: error?.response?.data?.message || 'Failed to activate app.',
        variant: 'destructive',
      })
    }
  }
  
  // Handle deactivate
  const handleDeactivate = async () => {
    if (!app) return
    
    try {
      await deactivateApp.mutateAsync(app.id)
      await refetch()
      toast({
        title: 'App Deactivated',
        description: 'The app has been deactivated.',
      })
    } catch (error: any) {
      toast({
        title: 'Deactivation Failed',
        description: error?.response?.data?.message || 'Failed to deactivate app.',
        variant: 'destructive',
      })
    }
  }
  
  // Handle run now
  const handleRunNow = async () => {
    if (!app) return
    
    try {
      const result = await runApp.mutateAsync(app.id)
      toast({
        title: 'Job Started',
        description: `Run ID: ${result.run_id}`,
      })
    } catch (error: any) {
      toast({
        title: 'Run Failed',
        description: error?.response?.data?.message || 'Failed to start the job.',
        variant: 'destructive',
      })
    }
  }
  
  // Copy code to clipboard
  const handleCopy = async () => {
    if (!app?.generated_code) return
    
    try {
      await navigator.clipboard.writeText(app.generated_code)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: 'Code copied to clipboard.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      })
    }
  }
  
  // Download code as file
  const handleDownload = () => {
    if (!app?.generated_code || !app?.name) return
    
    const blob = new Blob([app.generated_code], { type: 'text/x-python' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${app.name.toLowerCase().replace(/\s+/g, '_')}.py`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Downloaded!',
      description: 'PySpark code downloaded successfully.',
    })
  }
  
  // Generate code
  const handleGenerateCode = async () => {
    if (!app) return
    
    try {
      await generateCode.mutateAsync(app.id)
      // Refetch to get the newly generated code
      await refetch()
      toast({
        title: 'Code Generated',
        description: 'Successfully generated PySpark code.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate code. Please try again.',
        variant: 'destructive',
      })
    }
  }
  
  // Delete app
  const handleDeleteConfirm = async () => {
    if (!app) return
    
    try {
      await deleteApp.mutateAsync(app.id)
      toast({
        title: 'App Deleted',
        description: `Successfully deleted "${app.name}"`,
      })
      navigate('/app/pyspark')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete app. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }
  
  if (error || !app) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading App</h2>
            <p className="text-muted-foreground mb-4">
              Failed to load PySpark application details.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate('/app/pyspark')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const statusConfig = STATUS_CONFIG[app.status]
  const includedColumns = app.columns_config.filter(c => c.include)
  
  return (
    <div className="container py-8">
      <PageHeader
        icon={<FileCode className="h-5 w-5" />}
        title={app.name}
        description={
          app.description
            ? `${app.description} · Last updated ${formatDate(app.updated_at)}`
            : `Last updated ${formatDate(app.updated_at)}`
        }
        eyebrow={
          <div className="flex items-center gap-2">
            <Link
              to="/app/pyspark"
              className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              PySpark Apps
            </Link>
            <Badge variant={statusConfig.variant}>
              <span className="flex items-center gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </Badge>
          </div>
        }
        actions={
          <>
            {/* Run Now button - only for active apps */}
            {app.status === 'active' && app.generated_code && (
              <Button
                variant="default"
                onClick={handleRunNow}
                disabled={runApp.isPending}
              >
                {runApp.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Run Now
              </Button>
            )}

            {/* Activate/Deactivate button (demoted to outline) */}
            {app.status === 'active' ? (
              <Button
                variant="outline"
                onClick={handleDeactivate}
                disabled={deactivateApp.isPending}
              >
                {deactivateApp.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <PowerOff className="h-4 w-4 mr-2" />
                )}
                Deactivate
              </Button>
            ) : app.generated_code ? (
              <Button
                variant="outline"
                onClick={handleActivate}
                disabled={activateApp.isPending}
              >
                {activateApp.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Power className="h-4 w-4 mr-2" />
                )}
                Activate
              </Button>
            ) : null}

            <Button
              variant="outline"
              onClick={handleGenerateCode}
              disabled={generateCode.isPending}
            >
              {generateCode.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Code
            </Button>
            <Button
              variant={app.status === 'active' && app.generated_code ? 'outline' : 'default'}
              asChild
            >
              <Link to={`/app/pyspark/${app.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </>
        }
      />
      
      {/* Workflow Status Indicator */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2">
            {/* Step 1: Configure */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                app.status !== 'draft' || app.columns_config.length > 0
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Configure</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            {/* Step 2: Generate Code */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                app.generated_code
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {app.generated_code ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <FileCode className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm font-medium">Generate Code</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            {/* Step 3: Activate */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                app.status === 'active'
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {app.status === 'active' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm font-medium">Activate</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            {/* Step 4: Run */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                app.last_run_at
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {app.last_run_at ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm font-medium">Run</span>
            </div>
          </div>
          
          {/* Last run info */}
          {app.last_run_at && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Last run: {formatDate(app.last_run_at)} 
              {app.last_run_status && (
                <Badge variant={app.last_run_status === 'success' ? 'default' : 'destructive'} className="ml-2">
                  {app.last_run_status}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Content Tabs */}
      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="code">Generated Code</TabsTrigger>
        </TabsList>
        
        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          {/* Source Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Source Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Connection ID</span>
                <p className="font-medium">{app.connection_id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Source Type</span>
                <p className="font-medium capitalize">{app.source_type}</p>
              </div>
              {app.source_type === 'table' ? (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Schema</span>
                    <p className="font-medium">{app.source_schema || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Table</span>
                    <p className="font-medium">{app.source_table || '-'}</p>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <span className="text-sm text-muted-foreground">Query</span>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {app.source_query}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Columns Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Columns ({includedColumns.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {includedColumns.map(col => (
                  <Badge key={col.name} variant="secondary">
                    {col.name}
                    <span className="ml-1 text-xs opacity-70">({col.data_type})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Key Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Key Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <span className="text-sm text-muted-foreground">Primary Key Columns</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {app.primary_key_columns.length > 0 ? (
                    app.primary_key_columns.map(col => (
                      <Badge key={col} variant="outline">{col}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">CDC Type</span>
                <p className="font-medium">{CDC_LABELS[app.cdc_type]}</p>
                {app.cdc_column && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Column: {app.cdc_column}
                  </p>
                )}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Partition Columns</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {app.partition_columns.length > 0 ? (
                    app.partition_columns.map(col => (
                      <Badge key={col} variant="outline">{col}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* SCD & Write Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                SCD & Write Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">SCD Type</span>
                <p className="font-medium">{SCD_LABELS[app.scd_type]}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Write Mode</span>
                <p className="font-medium">{WRITE_MODE_LABELS[app.write_mode]}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Target Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Target Configuration
                </CardTitle>
                {app.target_database && app.target_table && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/app/dbt-studio?source_schema=${encodeURIComponent(
                          app.target_database!
                        )}&source_table=${encodeURIComponent(
                          app.target_table!
                        )}&tab=builder`
                      )
                    }
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Use in dbt Studio
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <span className="text-sm text-muted-foreground">Target Database</span>
                <p className="font-medium">{app.target_database || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Target Table</span>
                <p className="font-medium">{app.target_table || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">ClickHouse Engine</span>
                <p className="font-medium">{app.target_engine || 'MergeTree'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Code Tab */}
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated PySpark Code</CardTitle>
                {app.generated_code && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCode(!showCode)}
                    >
                      {showCode ? (
                        <><EyeOff className="h-4 w-4 mr-2" />Hide Code</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-2" />Show Code</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
              {app.generated_at && (
                <CardDescription>
                  Generated on: {formatDate(app.generated_at)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {app.generated_code ? (
                showCode ? (
                  <div className="rounded-md overflow-hidden max-h-[70vh] overflow-y-auto border border-slate-800">
                    <pre className="p-4 text-sm font-mono bg-slate-950 text-slate-50 overflow-x-auto whitespace-pre min-w-max">
                      <code>{app.generated_code}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-center bg-muted/30 rounded-md">
                    <p className="text-muted-foreground">Code is hidden. Click "Show Code" to view.</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Code Generated</h3>
                  <p className="text-muted-foreground mb-4">
                    Click the "Generate Code" button to generate PySpark code for this configuration.
                  </p>
                  <Button onClick={handleGenerateCode} disabled={generateCode.isPending}>
                    {generateCode.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Generate Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PySpark App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{app.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteApp.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PySparkAppDetailPage
