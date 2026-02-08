import { useCallback, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Node,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { dagService, TaskConfig } from '@/services/dagService'
import { pysparkApi } from '@/services/pysparkApi'
import type { PySparkApp } from '@/types/pyspark'
import {
  Save,
  Play,
  Upload,
  ArrowLeft,
  Database,
  Code2,
  Mail,
  Timer,
  Terminal,
  Loader2,
  Sparkles,
  Tag,
} from 'lucide-react'

const taskTypes = [
  { type: 'spark_submit', label: 'Spark Submit', icon: Database, color: '#ef4444' },
  { type: 'dbt_run', label: 'dbt Run', icon: Code2, color: '#10b981' },
  { type: 'dbt_test', label: 'dbt Test', icon: Code2, color: '#06b6d4' },
  { type: 'email', label: 'Email', icon: Mail, color: '#8b5cf6' },
  { type: 'http_sensor', label: 'HTTP Sensor', icon: Timer, color: '#f59e0b' },
  { type: 'bash_operator', label: 'Bash Script', icon: Terminal, color: '#6b7280' },
]

export function DagBuilderPage() {
  const { dagId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const isEditing = !!dagId

  const [dagName, setDagName] = useState(dagId || '')
  const [description, setDescription] = useState('')
  const [dagTags, setDagTags] = useState<string[]>([])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  
  // Get tenant name for auto-tagging
  const tenantName = user?.tenant_name || 'default'
  const tenantSlug = tenantName.toLowerCase().replace(/\s+/g, '-')
  
  // PySpark apps for Spark Submit task configuration
  const [pysparkApps, setPysparkApps] = useState<PySparkApp[]>([])
  const [loadingApps, setLoadingApps] = useState(false)
  const [taskConfigs, setTaskConfigs] = useState<Record<string, Record<string, unknown>>>({})
  
  // Default Spark master URL (can be configured via environment)
  const defaultSparkMaster = 'spark://spark-master:7077'
  
  // Initialize tenant tag on mount
  useEffect(() => {
    if (tenantSlug && !dagTags.includes(tenantSlug)) {
      setDagTags(prev => [...prev, tenantSlug])
    }
  }, [tenantSlug])
  
  // Load PySpark apps on component mount
  useEffect(() => {
    setLoadingApps(true)
    pysparkApi.list({ per_page: 100 })
      .then(response => {
        console.log('[DagBuilder] PySpark apps loaded:', response)
        setPysparkApps(response.apps || [])
      })
      .catch(err => {
        console.error('Failed to load PySpark apps:', err)
      })
      .finally(() => setLoadingApps(false))
  }, [])
  
  // Update task config and auto-fill fields when PySpark app is selected
  const updateTaskConfig = (nodeId: string, key: string, value: unknown) => {
    setTaskConfigs(prev => {
      const updated = {
        ...prev,
        [nodeId]: {
          ...(prev[nodeId] || {}),
          [key]: value
        }
      }
      
      // If a PySpark app is selected, auto-fill the app path, spark master, and DAG name
      if (key === 'pyspark_app_id' && value) {
        const selectedApp = pysparkApps.find(app => app.id === value)
        if (selectedApp) {
          // Auto-fill application path based on generated code location
          const appNameSlug = selectedApp.name.toLowerCase().replace(/\s+/g, '_')
          const appPath = `/opt/spark/jobs/${appNameSlug}.py`
          updated[nodeId] = {
            ...updated[nodeId],
            application_path: appPath,
            spark_master: defaultSparkMaster,
            app_name: selectedApp.name,
          }
          
          // Auto-name the DAG based on PySpark app
          const generatedDagName = `${appNameSlug}_pipeline`
          setDagName(generatedDagName)
          setDescription(`Data pipeline for ${selectedApp.name} - extracting from ${selectedApp.source_table} to ${selectedApp.target_table}`)
          
          // Add pyspark tag if not already present
          setDagTags(prev => {
            const newTags = [...prev]
            if (!newTags.includes('pyspark')) newTags.push('pyspark')
            if (!newTags.includes('etl')) newTags.push('etl')
            return newTags
          })
        }
      }
      
      return updated
    })
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1' },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onDragStart = (event: React.DragEvent, taskType: string) => {
    event.dataTransfer.setData('application/tasktype', taskType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const taskType = event.dataTransfer.getData('application/tasktype')
      if (!taskType) return

      const taskDef = taskTypes.find((t) => t.type === taskType)
      if (!taskDef) return

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const position = {
        x: event.clientX - reactFlowBounds.left - 75,
        y: event.clientY - reactFlowBounds.top - 25,
      }

      const newId = `${taskType}_${Date.now()}`
      const newNode: Node = {
        id: newId,
        position,
        data: { label: taskDef.label, taskType },
        style: {
          background: taskDef.color,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 500,
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Convert ReactFlow nodes to TaskConfig format
  const nodesToTasks = (): TaskConfig[] => {
    return nodes.map((node) => {
      // Find dependencies based on edges
      const dependencies = edges
        .filter((edge) => edge.target === node.id)
        .map((edge) => edge.source)

      return {
        task_id: node.id,
        task_type: node.data.taskType,
        config: taskConfigs[node.id] || {},
        timeout_minutes: 60,
        retries: 1,
        retry_delay_minutes: 5,
        trigger_rule: 'all_success',
        depends_on: dependencies,
        position_x: node.position.x,
        position_y: node.position.y,
      }
    })
  }

  const handleSave = async () => {
    if (!dagName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'DAG name is required',
        variant: 'destructive',
      })
      return
    }

    if (nodes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Add at least one task to the DAG',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const tasks = nodesToTasks()
      
      if (isEditing && dagId) {
        await dagService.update(dagId, {
          description,
          tasks,
        })
        toast({
          title: 'DAG Updated',
          description: `Successfully updated ${dagName}`,
        })
      } else {
        const dag = await dagService.create({
          dag_id: dagName,
          description,
          schedule_type: 'manual',
          tasks,
        })
        toast({
          title: 'DAG Created',
          description: `Successfully created ${dag.dag_id}`,
        })
        navigate(`/app/dags/${dag.id}/edit`)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save DAG. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeploy = async () => {
    if (!dagId && !isEditing) {
      toast({
        title: 'Save Required',
        description: 'Please save the DAG before deploying',
        variant: 'destructive',
      })
      return
    }

    setIsDeploying(true)
    try {
      const result = await dagService.deploy(dagId || dagName)
      toast({
        title: 'DAG Deployed',
        description: result.message || 'DAG successfully deployed to Airflow',
      })
    } catch (error) {
      toast({
        title: 'Deploy Failed',
        description: 'Failed to deploy DAG. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Task Palette */}
      <Card className="w-64 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Task Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {taskTypes.map((task) => (
            <div
              key={task.type}
              draggable
              onDragStart={(e) => onDragStart(e, task.type)}
              className="flex items-center gap-2 rounded-lg border p-2 cursor-grab hover:bg-accent transition-colors"
              style={{ borderLeftColor: task.color, borderLeftWidth: 3 }}
            >
              <task.icon className="h-4 w-4" style={{ color: task.color }} />
              <span className="text-sm">{task.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/dags')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              {isEditing ? 'Edit DAG' : 'Create New DAG'}
            </span>
            <div className="flex items-center gap-2">
              <Input
                placeholder="DAG Name"
                value={dagName}
                onChange={(e) => setDagName(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={handleDeploy} disabled={isDeploying || !isEditing}>
              {isDeploying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isDeploying ? 'Deploying...' : 'Deploy'}
            </Button>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Trigger Run
            </Button>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div
          className="flex-1 rounded-lg border bg-background"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Controls />
            <Background />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* Properties Panel */}
      <Card className="w-80 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {selectedNode ? 'Task Properties' : 'DAG Properties'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedNode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task ID</Label>
                <Input value={selectedNode.id} disabled />
              </div>
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Input value={selectedNode.data.taskType} disabled />
              </div>
              
              {/* Spark Submit specific config */}
              {selectedNode.data.taskType === 'spark_submit' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    PySpark App Configuration
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Select PySpark App</Label>
                    {loadingApps ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading apps...
                      </div>
                    ) : (
                      <Select
                        value={taskConfigs[selectedNode.id]?.pyspark_app_id as string || ''}
                        onValueChange={(value) => updateTaskConfig(selectedNode.id, 'pyspark_app_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a PySpark app..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pysparkApps.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No PySpark apps available
                            </div>
                          ) : (
                            pysparkApps.map(app => (
                              <SelectItem key={app.id} value={app.id}>
                                {app.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select an existing PySpark app or leave empty to configure manually.
                    </p>
                  </div>
                  
                  {/* Show selected app info */}
                  {taskConfigs[selectedNode.id]?.pyspark_app_id && (
                    <div className="rounded-md border p-3 bg-muted/50 text-xs space-y-1">
                      {(() => {
                        const app = pysparkApps.find(a => a.id === taskConfigs[selectedNode.id]?.pyspark_app_id)
                        return app ? (
                          <>
                            <p><strong>App:</strong> {app.name}</p>
                            <p><strong>Table:</strong> {app.source_table}</p>
                            <p><strong>Target:</strong> {app.target_database}.{app.target_table}</p>
                          </>
                        ) : null
                      })()}
                    </div>
                  )}
                  
                  {/* Always show Application Path and Spark Master */}
                  <div className="space-y-2">
                    <Label>Application Path</Label>
                    <Input 
                      placeholder="/opt/spark/jobs/my_job.py"
                      value={taskConfigs[selectedNode.id]?.application_path as string || ''}
                      onChange={(e) => updateTaskConfig(selectedNode.id, 'application_path', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {taskConfigs[selectedNode.id]?.pyspark_app_id ? 'Auto-filled from selected app' : 'Path to PySpark script'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Spark Master</Label>
                    <Input 
                      placeholder="spark://spark-master:7077"
                      value={taskConfigs[selectedNode.id]?.spark_master as string || defaultSparkMaster}
                      onChange={(e) => updateTaskConfig(selectedNode.id, 'spark_master', e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Timeout (minutes)</Label>
                <Input 
                  type="number" 
                  value={taskConfigs[selectedNode.id]?.timeout_minutes as number || 60}
                  onChange={(e) => updateTaskConfig(selectedNode.id, 'timeout_minutes', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Retries</Label>
                <Input 
                  type="number" 
                  value={taskConfigs[selectedNode.id]?.retries as number || 1}
                  onChange={(e) => updateTaskConfig(selectedNode.id, 'retries', parseInt(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="DAG description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Input placeholder="0 0 * * *" />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input defaultValue="UTC" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <Label>Tags</Label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {dagTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {dagTags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-tagged with tenant: {tenantName}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
