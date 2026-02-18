/**
 * Project Structure Viewer Component
 *
 * Displays the tenant's dbt project file tree with ability to view file contents.
 * Only accessible to super_admin and data_engineer roles.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Database,
  FileCode,
  FileText,
  RefreshCw,
  Settings,
  Layers,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useProjectStructure,
  useFileContent,
  useInitProject,
  useDiscoverSources,
  useGenerateDag,
} from '../hooks/useDbtStudio'
import type { ProjectNode } from '../services/dbtStudioApi'

interface ProjectViewerProps {
  onFileSelect?: (path: string, content: string) => void
}

export function ProjectViewer({ onFileSelect }: ProjectViewerProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']))

  // Queries
  const { data: structure, isLoading, refetch } = useProjectStructure()
  const { data: fileData, isLoading: fileLoading } = useFileContent(selectedFile || '', !!selectedFile)

  // Mutations
  const initProject = useInitProject()
  const discoverSources = useDiscoverSources()
  const generateDag = useGenerateDag()

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Handle file click
  const handleFileClick = useCallback(
    (path: string) => {
      setSelectedFile(path)
      if (onFileSelect && fileData?.content) {
        onFileSelect(path, fileData.content)
      }
    },
    [onFileSelect, fileData]
  )

  // Initialize project
  const handleInitProject = async () => {
    try {
      await initProject.mutateAsync()
      toast({ title: 'Project initialized successfully' })
      refetch()
    } catch (error) {
      toast({ title: 'Failed to initialize project', variant: 'destructive' })
    }
  }

  // Discover sources
  const handleDiscoverSources = async () => {
    try {
      const result = await discoverSources.mutateAsync()
      toast({
        title: 'Sources discovered',
        description: `Found ${result.tables_discovered} tables in ${result.source_database}`,
      })
      refetch()
    } catch (error) {
      toast({ title: 'Failed to discover sources', variant: 'destructive' })
    }
  }

  // Generate DAG
  const handleGenerateDag = async () => {
    try {
      const result = await generateDag.mutateAsync({
        dag_id: 'daily_run',
        schedule_interval: '0 6 * * *',
        dbt_command: 'build',
        include_test: true,
      })
      toast({
        title: 'DAG generated',
        description: `Created ${result.dag_id}`,
      })
    } catch (error) {
      toast({ title: 'Failed to generate DAG', variant: 'destructive' })
    }
  }

  // Get icon for file type
  const getFileIcon = (node: ProjectNode) => {
    if (node.type === 'directory') {
      return expandedFolders.has(node.path) ? (
        <FolderOpen className="h-4 w-4 text-yellow-500" />
      ) : (
        <Folder className="h-4 w-4 text-yellow-500" />
      )
    }

    const ext = node.extension?.toLowerCase()
    switch (ext) {
      case '.sql':
        return <Database className="h-4 w-4 text-blue-500" />
      case '.yml':
      case '.yaml':
        return <Settings className="h-4 w-4 text-purple-500" />
      case '.py':
        return <FileCode className="h-4 w-4 text-green-500" />
      case '.md':
        return <FileText className="h-4 w-4 text-gray-500" />
      default:
        return <File className="h-4 w-4 text-gray-400" />
    }
  }

  // Render tree node
  const renderNode = (node: ProjectNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedFile === node.path
    const paddingLeft = depth * 16 + 8

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-muted'
          }`}
          style={{ paddingLeft }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(node.path)
            } else {
              handleFileClick(node.path)
            }
          }}
        >
          {node.type === 'directory' && (
            <span className="w-4">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          {node.type !== 'directory' && <span className="w-4" />}
          {getFileIcon(node)}
          <span className="text-sm truncate flex-1">{node.name}</span>
          {node.size !== undefined && (
            <span className="text-xs text-muted-foreground">
              {node.size > 1024 ? `${(node.size / 1024).toFixed(1)}KB` : `${node.size}B`}
            </span>
          )}
        </div>

        <AnimatePresence>
          {node.type === 'directory' && isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map((child) => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!structure?.exists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Not Initialized</CardTitle>
          <CardDescription>
            The dbt project for your tenant has not been created yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Initialize the project to create the dbt project structure and discover source tables
              from your ClickHouse database.
            </p>
            <Button onClick={handleInitProject} disabled={initProject.isPending}>
              {initProject.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Initialize Project
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Project Tree */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Project Structure</CardTitle>
              <CardDescription className="text-xs">
                {structure.tenant_slug}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Database Info */}
          <div className="flex gap-2 mb-4">
            <Badge variant="outline" className="text-xs">
              Source: {structure.source_database}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Target: {structure.target_database}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscoverSources}
              disabled={discoverSources.isPending}
            >
              <Database className="h-4 w-4 mr-1" />
              Discover Sources
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDag}
              disabled={generateDag.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              Generate DAG
            </Button>
          </div>

          {/* File Tree */}
          <ScrollArea className="h-[400px] border rounded p-2">
            {structure.structure && renderNode(structure.structure)}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* File Content Viewer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {selectedFile ? selectedFile.split('/').pop() : 'File Viewer'}
          </CardTitle>
          <CardDescription className="text-xs truncate">
            {selectedFile || 'Select a file to view its contents'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            fileLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <ScrollArea className="h-[450px] border rounded">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                  {fileData?.content || 'Unable to load file content'}
                </pre>
              </ScrollArea>
            )
          ) : (
            <div className="h-[450px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Click a file to view its contents</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProjectViewer
