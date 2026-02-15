import { Database, MoreVertical, Play, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataSource } from '@/types/datasource'
import { DATABASE_TYPES } from '@/types/datasource'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useTestConnection, useDeleteDataSource, useTriggerSync } from '../hooks'

interface DataSourceCardProps {
  datasource: DataSource
}

export function DataSourceCard({ datasource }: DataSourceCardProps) {
  const navigate = useNavigate()
  const testConnection = useTestConnection()
  const deleteDataSource = useDeleteDataSource()
  const triggerSync = useTriggerSync()

  const dbTypeInfo = DATABASE_TYPES[datasource.db_type]
  
  const statusConfig = {
    active: { variant: 'success' as const, icon: CheckCircle2, label: 'Active' },
    inactive: { variant: 'secondary' as const, icon: Clock, label: 'Inactive' },
    testing: { variant: 'info' as const, icon: Clock, label: 'Testing' },
    error: { variant: 'destructive' as const, icon: AlertCircle, label: 'Error' },
  }

  const status = statusConfig[datasource.status]
  const StatusIcon = status.icon

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation()
    testConnection.mutate(datasource.id)
  }

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerSync.mutate({ id: datasource.id })
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${datasource.name}"?`)) {
      deleteDataSource.mutate(datasource.id)
    }
  }

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/app/datasources/${datasource.id}`)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{datasource.name}</h3>
            <p className="text-sm text-muted-foreground">{dbTypeInfo.name}</p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTest}>
              Test Connection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSync}>
              <Play className="h-4 w-4 mr-2" />
              Trigger Sync
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            {datasource.ssl_enabled && (
              <Badge variant="outline">SSL</Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Host:</span>
              <span className="font-mono text-xs">{datasource.host}:{datasource.port}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Database:</span>
              <span className="font-mono text-xs">{datasource.database}</span>
            </div>
            {datasource.schema_name && (
              <div className="flex items-center justify-between">
                <span>Schema:</span>
                <span className="font-mono text-xs">{datasource.schema_name}</span>
              </div>
            )}
          </div>
          
          {datasource.last_synced_at && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Last synced {formatDistanceToNow(new Date(datasource.last_synced_at), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
