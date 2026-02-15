import { useState, useEffect } from 'react'
import { Database, AlertCircle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { dataSourceService } from '@/services/dataSourceService'
import type { ConnectionTestResult } from '@/types/datasource'

interface SchemaSelectorProps {
  connectionData: {
    db_type: string
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl_enabled?: boolean
    extra_params?: Record<string, unknown>
  }
  testResult: ConnectionTestResult | null
  selectedSchema: string | null
  onSchemaChange: (schema: string | null) => void
}

export function SchemaSelector({
  connectionData,
  testResult,
  selectedSchema,
  onSchemaChange,
}: SchemaSelectorProps) {
  const [schemas, setSchemas] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  // Extract schemas from test result
  useEffect(() => {
    if (testResult?.success && testResult.details?.schemas) {
      setSchemas(testResult.details.schemas)
      // Auto-select if only one schema or if 'public' exists
      if (testResult.details.schemas.length === 1) {
        onSchemaChange(testResult.details.schemas[0])
      } else if (testResult.details.schemas.includes('public') && !selectedSchema) {
        onSchemaChange('public')
      }
    }
  }, [testResult, onSchemaChange, selectedSchema])

  const refreshSchemas = async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const result = await dataSourceService.testNewConnection({
        db_type: connectionData.db_type as any,
        host: connectionData.host,
        port: connectionData.port,
        database: connectionData.database,
        username: connectionData.username,
        password: connectionData.password,
        ssl_enabled: connectionData.ssl_enabled,
        extra_params: connectionData.extra_params,
      })
      if (result.success && result.details?.schemas) {
        setSchemas(result.details.schemas)
      }
    } catch (err) {
      setRefreshError('Failed to refresh schemas')
    } finally {
      setRefreshing(false)
    }
  }

  // Show connection failed state
  if (!testResult?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
            Connection Failed
          </h3>
          <p className="text-muted-foreground max-w-md">
            {testResult?.message || 'Unable to connect to the database. Please go back and check your connection details.'}
          </p>
        </div>
      </div>
    )
  }

  // Show connection successful state with schema selection
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
            Connection Successful
          </h3>
          <p className="text-sm text-muted-foreground">{testResult.message}</p>
        </div>
        
        {/* Connection Details */}
        {testResult.details && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {testResult.details.version && (
              <span>Version: <code className="px-1 py-0.5 bg-muted rounded">{testResult.details.version}</code></span>
            )}
            {testResult.details.latency_ms && (
              <span>Latency: <code className="px-1 py-0.5 bg-muted rounded">{testResult.details.latency_ms}ms</code></span>
            )}
          </div>
        )}
      </div>

      {/* Schema Selection */}
      <div className="border-t pt-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-base font-medium">Select Schema</h4>
            <p className="text-sm text-muted-foreground">
              Choose the database schema you want to work with. This determines which tables and views will be available.
            </p>
          </div>

          {schemas.length === 0 ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No schemas found in the database.</span>
              </div>
              <Button variant="outline" size="sm" onClick={refreshSchemas} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="schema">
                  Schema <span className="text-destructive">*</span>
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshSchemas} 
                  disabled={refreshing}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <Select value={selectedSchema || ''} onValueChange={onSchemaChange}>
                <SelectTrigger id="schema" className="w-full">
                  <SelectValue placeholder="Select a schema..." />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map((schema) => (
                    <SelectItem key={schema} value={schema}>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        {schema}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                {schemas.length} schema{schemas.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}

          {refreshError && (
            <p className="text-sm text-destructive">{refreshError}</p>
          )}

          {selectedSchema && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Selected:</span>{' '}
                <code className="px-1.5 py-0.5 bg-primary/10 rounded text-primary font-mono">{selectedSchema}</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
